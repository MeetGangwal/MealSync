# MealSync — Verification Record

Results recorded on **2026-10-29** on the integration branch `integration/mealsync-cloud`
(Windows 11, Docker Desktop with Engine 29.0.1, Docker Desktop Kubernetes v1.34.1).
"Local" means a developer machine — **nothing was deployed to a cloud provider.**

How to reproduce each check is listed under its section.

---

## 1. Backend build and tests

```bash
cd backend && ./mvnw clean verify          # Windows: mvnw.cmd clean verify (Docker must be running)
```

| Result | Detail |
|---|---|
| **BUILD SUCCESS, 83 / 83 tests passed** | 73 unit/controller/security tests (Mockito, MockMvc) |
| | 6 integration tests on **MySQL 8.4 (Testcontainers)**: meal catalogue, demo users off by default, register → login → `/me` → admin 403 → no-token 401, Actuator only on the management port, opt-in demo seeding, **concurrent seeding creates no duplicates** |
| | 4 environment-binding tests: `MEALSYNC_SEED_DEMO_USERS` → `mealsync.seed.demo-users`, `DB_HOST/DB_PORT/DB_NAME` → JDBC URL, `JWT_EXPIRATION_MS`, `DB_USERNAME` |

The concurrency test was confirmed to **fail when the seeding lock is removed** and pass with it.

## 2. Frontend

```bash
cd frontend && npm ci && npm run lint && npm run build
```
Lint: 0 errors (pre-existing warnings only). Build: success. The production bundle contains
no demo credentials.

## 3. Docker Compose stack

```bash
docker compose up -d --build
bash scripts/smoke-test.sh http://localhost:<FRONTEND_HOST_PORT>
```
Host ports on the verification machine (defaults were taken by other software):
frontend **3080**, backend **18080**, Prometheus **19090**, Grafana **3001**, cAdvisor **8090**.

| Check | Result |
|---|---|
| Containers | db, backend, frontend, prometheus, grafana, cadvisor — **all healthy** |
| Smoke test (frontend → Nginx `/api` → backend → MySQL) | **22 / 22 passed** — UI, menu, register, duplicate 409, wrong password 401, login, `/me`, no-token 401, student → admin 403, tampered token 401, place order, idempotent retry, history, cancel, Actuator not exposed |
| Same smoke test from a Linux container (as in CI) | 22 / 22 |
| MySQL | 8.4.13, `utf8mb4` / `utf8mb4_unicode_ci` on server and all 4 tables; 42 meals; passwords BCrypt-hashed; 0 demo users; 4-byte emoji round-trip OK |
| Persistence | Counts identical after `docker compose restart db backend`; smoke test 22 / 22 afterwards |
| Exposure | Backend publishes only 8080 (as 18080); management port 8081 not published; monitoring bound to 127.0.0.1 |

## 4. Monitoring (Compose)

| Check | Result |
|---|---|
| Prometheus targets | `mealsync-backend` (`backend:8081/actuator/prometheus`), `cadvisor`, `prometheus` — **all UP** |
| Grafana | Health OK; anonymous API → 401; datasource `prometheus` → "Successfully queried the Prometheus API"; dashboard "MealSync — Container & Application Metrics" provisioned |
| Dashboard data | **17 / 17 panel queries return data** — per-service CPU/memory/host-memory share for 5 services, running services, request rate, p95 latency, 5xx rate, JVM heap, process CPU, HikariCP pool, requests by endpoint |

Note: cAdvisor reads per-service cgroups (`/mealsync/<service>`) because its Docker integration
cannot read Docker Desktop's containerd image store; see [DOCKER.md](DOCKER.md#5-monitoring-details).

## 5. Load test (k6, Compose)

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:3080 -e VUS=20 -e DURATION=30s \
  grafana/k6:1.3.0 run - < infra/load-testing/k6-test.js
```

| Metric | Result | Threshold |
|---|---|---|
| Requests | 12 938 (≈ 310 req/s), 20 virtual users, ~40 s | — |
| Failed requests | **0.00 %** | < 1 % ✓ |
| Checks | 16 170 / 16 170 (100 %) | > 99 % ✓ |
| p95 `GET /api/meals` (DB-backed) | 13.4 ms (p99 21.4 ms) | < 500 ms ✓ |
| p95 `GET /api/auth/me` (JWT) | 16.4 ms (p99 31.8 ms) | < 500 ms ✓ |
| p95 static (`/health`, `/`) | 3.7 ms | < 200 ms ✓ |

## 6. Kubernetes (local Docker Desktop cluster)

```bash
kubectl apply -k k8s            # after creating mealsync-secret, see k8s/README.md
bash scripts/smoke-test.sh http://localhost:30080
```

| Check | Result |
|---|---|
| Manifests | kustomize render + kubeconform (strict, K8s 1.30 schemas): **22 / 22 valid** |
| Pods | mysql-0, 2× backend, 2× frontend, prometheus, grafana — **7 / 7 Running and Ready, 0 restarts** |
| Cold start | MySQL restarted together with fresh backend pods: backends waited in `Init:0/1`, then started with 0 restarts (before the fix each crashed once) |
| Smoke test via NodePort 30080 | **22 / 22 passed** (also after MySQL pod restart and after backend fix rollout) |
| MySQL | 8.4.13, `utf8mb4`; 0 demo users; data identical after deleting pod `mysql-0` (PVC `mysql-data-mysql-0`, 2 Gi, Bound) |
| Multi-replica seeding | Bug found: 2 replicas starting together inserted 9 duplicate meals → fixed with a MySQL named lock; after fix a simultaneous 2-replica start leaves 42 meals, 0 duplicates |
| Self-healing | Deleted a backend pod under traffic: **40 / 40 requests succeeded**, replacement pod Ready |
| Prometheus | Pod discovery: **one target per backend pod (2) + prometheus — all UP** |
| Grafana | Health OK; anonymous 401; datasource OK; dashboard "MealSync — Backend (Kubernetes)" provisioned; **13 / 13 queries return data**, per pod |
| Logs | 0 error lines in backend, frontend, mysql, prometheus, grafana |
| HPA | Created; `cpu: <unknown>` — **no metrics-server** in Docker Desktop (not installed) |
| Ingress | Created; no address — **no ingress controller** installed; NodePort 30080 used instead |

## 7. Infrastructure-as-code validation (no resources created)

| Tool | Command (run in containers locally; same in CI) | Result |
|---|---|---|
| Docker Compose | `docker compose --env-file .env.example config -q` | Valid |
| Terraform 1.9.8 | `fmt -check -recursive`, `init -backend=false`, `validate` | fmt OK; **"Success! The configuration is valid."** — never planned or applied |
| Ansible (core 2.17.7) | `ansible-playbook --syntax-check` × 3 playbooks; `ansible-lint --offline` | 3 / 3 OK; **0 failures, 0 warnings** (production profile) |
| Prometheus config | `promtool check config` | SUCCESS |
| GitHub Actions | `actionlint 1.7.4` (incl. shellcheck) | No findings |

## 8. Not verified

- The GitHub Actions workflow has not run on GitHub yet (nothing has been pushed).
- HPA autoscaling and Ingress routing (cluster add-ons not installed).
- Ansible playbooks against a real Linux host; Terraform plan/apply (out of scope: no AWS).
