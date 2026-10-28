# MealSync — Docker Compose Guide

Local development and verification stack: **MySQL 8.4, Spring Boot backend, React/Nginx
frontend, Prometheus, cAdvisor and Grafana.** Verified results are in
[VERIFICATION.md](VERIFICATION.md).

---

## Required Tools

| Tool | Version used for verification | Check |
|---|---|---|
| Docker Desktop (Engine + Compose v2) | Engine 29.0.1 | `docker version`, `docker compose version` |
| Java 17+ (only to run Maven outside Docker) | JDK 21 | `java -version` |
| Node.js 20+ (only for frontend development) | 24.x | `node -v` |

---

## 1. Create `.env`

```bash
cp .env.example .env
```

Replace every `CHANGE_ME_...` value. `.env` is git-ignored — **never commit it**.
Random values can be generated with `openssl rand -hex 32` (or, in PowerShell,
`[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`).

| Variable | Required | Purpose |
|---|---|---|
| `DB_NAME` | no (default `mealsync`) | Database created in the MySQL container |
| `DB_USERNAME`, `DB_PASSWORD` | **yes** | Application database user |
| `DB_ROOT_PASSWORD` | **yes** | MySQL root password (initialisation + healthcheck) |
| `JWT_SECRET` | **yes** | HS256 signing key, ≥ 32 bytes |
| `JWT_EXPIRATION_MS` | no (default 24 h) | Token lifetime |
| `GRAFANA_ADMIN_USER` | no (default `admin`) | Grafana login |
| `GRAFANA_ADMIN_PASSWORD` | **yes** | Grafana login |
| `MEALSYNC_SEED_DEMO_USERS` | no (default `false`) | `true` creates demo accounts — local demos only |
| `MEALSYNC_DEMO_STUDENT_PASSWORD`, `MEALSYNC_DEMO_ADMIN_PASSWORD` | when demo seeding is on | Demo account passwords |
| `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT`, `PROMETHEUS_HOST_PORT`, `GRAFANA_HOST_PORT`, `CADVISOR_HOST_PORT` | no | Host ports if the defaults are taken |

Missing required values stop `docker compose` immediately with
`required variable ... is missing a value` — there are no hidden fallbacks.

---

## 2. Build and start

```bash
docker compose up -d --build
docker compose ps                 # every service should become "healthy"
```

Start-up order is enforced by healthchecks: `db` (MySQL ping) → `backend`
(`/actuator/health/readiness` on port 8081) → `frontend`.

---

## 3. Services and ports

| Service | Image | Host port (default) | Notes |
|---|---|---|---|
| `frontend` | `mealsync-frontend:local` | `3000` | Nginx: SPA + `/health` + proxies `/api/` to `backend:8080` |
| `backend` | `mealsync-backend:local` | `8080` | REST API; **8081** (Actuator) is internal only |
| `db` | `mysql:8.4` | — (not published) | `utf8mb4`, named volume `mealsync-db-data` |
| `prometheus` | `prom/prometheus:v2.53.0` | `127.0.0.1:9090` | Scrapes backend `:8081/actuator/prometheus` and cAdvisor |
| `cadvisor` | `gcr.io/cadvisor/cadvisor:v0.52.1` | `127.0.0.1:8090` | Per-service CPU/memory |
| `grafana` | `grafana/grafana:11.1.0` | `127.0.0.1:3001` | Provisioned datasource + dashboard |

How the backend reaches MySQL: Compose sets `DB_HOST=db`, `DB_PORT=3306`, `DB_NAME`,
`DB_USERNAME`, `DB_PASSWORD`; `application.yml` builds
`jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}`.

---

## 4. Verify

```bash
bash scripts/smoke-test.sh http://localhost:3000     # 22 checks: UI, API, auth, orders, DB, exposure
```

- Prometheus: http://localhost:9090/targets — `mealsync-backend`, `cadvisor`, `prometheus` all **UP**.
- Grafana: http://localhost:3001 → **Dashboards → MealSync — Container & Application Metrics**.
- Database (credentials come from the container's own environment; nothing is printed):
  ```bash
  docker compose exec db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES;"'
  ```

---

## 5. Monitoring details

**Backend metrics** come from Spring Boot Actuator + Micrometer on the management port
(`MANAGEMENT_PORT`, default 8081). Only `health` and `prometheus` are exposed, health details
are hidden, and the port is never published to the host. HTTP latency histograms are enabled
for the p95 panel.

**Container metrics (cAdvisor).** Each service runs under its own cgroup parent
(`cgroup_parent: /mealsync/<service>`), and cAdvisor reads those cgroups directly. Prometheus
keeps only the host total and the `/mealsync/<service>` series and adds a `service` label.
Why not cAdvisor's Docker integration: Docker Desktop's containerd image store is not readable
by cAdvisor ("failed to identify the read-write layer"), so the Docker socket is **not**
mounted. Network I/O is not available per cgroup this way, so the dashboard shows each
service's share of host memory instead.

**Dashboard panels:** CPU and memory by service, memory share of host, running services,
backend scrape status, database pool, HTTP request rate, p95 latency, 5xx rate, JVM heap,
process CPU, HikariCP connections, requests by endpoint.

---

## 6. Logs, stop, restart

```bash
docker compose logs -f backend          # or db / frontend / prometheus / grafana
docker compose restart backend
docker compose down                      # stops containers; named volumes (data) are kept
```

> `docker compose down -v` **deletes the database volume**. Do not run it unless you
> intend to wipe all data.

---

## 7. Demo accounts (optional, local only)

Set in `.env`:
```
MEALSYNC_SEED_DEMO_USERS=true
MEALSYNC_DEMO_STUDENT_PASSWORD=<choose one>
MEALSYNC_DEMO_ADMIN_PASSWORD=<choose one>
```
then `docker compose up -d backend`. This creates `aryan@spit.edu` (student) and
`admin@spit.mess` (admin). If either password is empty the demo accounts are skipped.
Never enable this on a shared deployment.

---

## Files

```
docker-compose.yml
.env.example
backend/Dockerfile            # Maven wrapper build → JRE 17 (non-root uid 1000)
frontend/Dockerfile           # Node build → Nginx
frontend/nginx.conf
infra/prometheus/prometheus.yml
infra/grafana/provisioning/{datasources,dashboards}/
scripts/smoke-test.sh
infra/load-testing/k6-test.js
```
