# MealSync — Security & Reliability

Current state of the integrated application and local infrastructure. Each item lists where it
is implemented; verified behaviour is recorded in [VERIFICATION.md](VERIFICATION.md).

## 1. Security controls

| Area | Control | Where |
|---|---|---|
| Secrets in Git | `.env`, `.env.*` (except templates), `k8s/*-secret.yaml`, `*.tfstate`, `*.tfvars`, vault files are git-ignored; only placeholder templates are tracked. Commits are scanned for secret values before committing. | `.gitignore`, `.env.example`, `k8s/02-secret.example.yaml` |
| No silent credential fallbacks | Compose refuses to start without `DB_USERNAME`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET`, `GRAFANA_ADMIN_PASSWORD` | `docker-compose.yml` |
| Kubernetes Secret safety | `mealsync-secret` is created from `.env` and is **not** in the kustomization, so `kubectl apply -k` cannot overwrite it with placeholders | `k8s/kustomization.yaml`, `k8s/README.md` |
| Password storage | BCrypt (strength 10); 6–72 character passwords | `SecurityConfig`, `UserService` |
| Tokens | HS256 JWT, secret ≥ 32 bytes from the environment, 24 h expiry | `JwtUtils`, `application.yml` |
| Authorization | Registration always `ROLE_USER`; `/api/admin/**` requires `ROLE_ADMIN`; students only see their own orders | `SecurityConfig`, `OrderController` |
| No secrets in logs or responses | JWT secret never printed (startup error and `start-backend.sh`); failed logins log only the failure type, not the email; JWT errors log only the exception type; 500 responses carry no exception text | `JwtUtils`, `AuthController`, `AuthTokenFilter`, `scripts/start-backend.sh` |
| Demo accounts | Off by default; created only with `MEALSYNC_SEED_DEMO_USERS=true` and passwords supplied via environment; no credentials in the frontend bundle | `DataSeeder`, `LoginPage.jsx` |
| Actuator exposure | Only `health` (no details) and `prometheus`, on internal port 8081 — not published by Compose, not routed by the ingress/NodePort, not proxied by Nginx | `application.yml`, `docker-compose.yml`, `k8s/04-backend.yaml` |
| Network exposure | MySQL never published; Prometheus, Grafana, cAdvisor bound to `127.0.0.1`; in Kubernetes only the frontend is exposed (NodePort 30080 / Ingress) | `docker-compose.yml`, `k8s/` |
| Containers | Backend runs as non-root uid 1000; pods drop all capabilities and disallow privilege escalation; cAdvisor runs without the Docker socket | Dockerfiles, `k8s/04-backend.yaml`, `docker-compose.yml` |
| Monitoring RBAC | Prometheus ServiceAccount may only `get/list/watch pods` in namespace `mealsync` | `k8s/08-monitoring.yaml` |
| Grafana | Admin password required; sign-up disabled; anonymous API access returns 401 | `docker-compose.yml`, `k8s/08-monitoring.yaml` |
| CI | `contents: read` permissions; no cloud deployment; image publishing disabled unless explicitly enabled | `.github/workflows/ci.yml` |

### Open security items
- **Rotate exposed credentials.** A database password and a JWT secret were committed in the
  early history of `main`, and another database password is inside `backend.zip` in the history
  of `feat/meet-application`. Removing them from current files does not remove them from Git
  history: change those passwords/secrets wherever they were used. Rewriting history is
  optional and needs coordination with every collaborator.
- JWT is stored in `sessionStorage` (XSS exposure); HttpOnly cookies would be stronger.
- Password reset is disabled until a token-based flow exists.
- MySQL connections use `useSSL=false` (acceptable on a local Docker/K8s network only).

## 2. Reliability

| Concern | Measure | Where |
|---|---|---|
| Start-up ordering | Compose: MySQL healthy → backend ready → frontend. Kubernetes: init container waits for MySQL; startup probe | `docker-compose.yml`, `k8s/04-backend.yaml` |
| Health checks | MySQL `mysqladmin ping` (password via `MYSQL_PWD`, not on the command line); backend Actuator readiness/liveness; Nginx `/health` | Compose, Dockerfiles, K8s probes |
| Multiple replicas | Data seeding serialized with a MySQL named lock released after commit (prevents duplicate rows when replicas start together) | `DataSeeder` (+ concurrency regression test) |
| Persistence | Compose named volume `mealsync-db-data`; Kubernetes PVC `mysql-data-mysql-0` (2 Gi) | Compose, `k8s/03-mysql.yaml` |
| Zero-downtime updates | RollingUpdate `maxSurge: 1`, `maxUnavailable: 0`, readiness gates traffic | `k8s/04-backend.yaml` |
| Self-healing | Deployments replace deleted/crashed pods | Kubernetes |
| Order safety | Pessimistic row lock on stock; idempotency key prevents double orders | `MealRepository`, `OrderController` |
| Observability | HTTP rate, p95 latency, 5xx rate, JVM heap, CPU, DB pool; per-service container CPU/memory (Compose) | Grafana dashboards |

## 3. Stop, rollback, teardown (data-safe first)

```bash
# Compose: stop, keep data
docker compose down
# Compose: DELETES the database volume — only when you really want to wipe data
# docker compose down -v

# Kubernetes: roll back a bad backend rollout
kubectl rollout undo deployment/mealsync-backend -n mealsync
# Kubernetes: stop, keep data
kubectl scale deployment --all -n mealsync --replicas=0
kubectl scale statefulset mysql -n mealsync --replicas=0
# Kubernetes: `kubectl delete -k k8s` also deletes the namespace and the MySQL PVC (data loss)
```

Terraform is never applied in this project, so there is no cloud teardown.
