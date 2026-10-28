# MealSync — Docker & Local Infrastructure Guide

> **Milestone 1** · Branch: `feat/cloud-native-deployment`  
> Owner: Aryan Sagar Dandekar (infrastructure)  
> Application: Meet Gangwal (backend + frontend)

---

## Required Tools

| Tool | Minimum Version | Check |
|---|---|---|
| Docker Desktop | 24.x | `docker --version` |
| Docker Compose | v2.20 | `docker compose version` |
| (Optional) Java 17 | 17.x | `java -version` |
| (Optional) Node.js | 20.x | `node -v` |

---

## Initial Setup

```powershell
# 1. Clone (if not already done)
git clone https://github.com/MeetGangwal/MealSync.git
cd MealSync

# 2. Create your local secrets file from the template
cp .env.example .env
# Then open .env and fill in real values (see Environment Variables below)

# 3. Generate a secure JWT secret
# PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
# Or on Linux/macOS:
openssl rand -hex 32
```

---

## Environment Variables

All variables are loaded from `.env` in the repository root.  
`.env` is git-ignored — **never commit it**.

| Variable | Required | Description | Example |
|---|---|---|---|
| `DB_NAME` | No | Database name | `mealsync` |
| `DB_USERNAME` | **Yes** | Database user | `mealsync_user` |
| `DB_PASSWORD` | **Yes** | Database password | `<strong password>` |
| `JWT_SECRET` | **Yes** | HMAC-SHA256 signing key (≥32 bytes) | `openssl rand -hex 32` |
| `JWT_EXPIRATION_MS` | No | Token lifetime ms (default 24 h) | `86400000` |
| `GRAFANA_ADMIN_USER` | No | Grafana admin username (default `admin`) | `admin` |
| `GRAFANA_ADMIN_PASSWORD` | **Yes** | Grafana admin password | `<strong password>` |

> **Compose vs Application**: Docker Compose reads `.env` to interpolate `${VAR}` inside `docker-compose.yml`.  
> Spring Boot reads the same variable names injected into the container via the `environment:` block.  
> These are two separate mechanisms — both are needed for the stack to work end-to-end.

---

## Building and Starting the Stack

```powershell
# Build all images (first time or after code changes)
docker compose build

# Start all services in the background
docker compose up -d

# Start only specific services
docker compose up -d db backend

# Rebuild and restart a single service
docker compose up -d --build backend
```

---

## Service Ports

| Service | Container Port | Host Port | Notes |
|---|---|---|---|
| `frontend` | 80 | **3000** | React app via Nginx |
| `backend` | 8080 | **8080** | Spring Boot API |
| `db` | 3306 | (internal only) | MySQL 8.4 — no host port exposed |
| `prometheus` | 9090 | **127.0.0.1:9090** | Localhost only |
| `cadvisor` | 8080 | **127.0.0.1:8090** | Localhost only (unprivileged metrics) |
| `grafana` | 3000 | **127.0.0.1:3001** | Localhost only |

Nginx proxies browser calls from `http://localhost:3000/api/*` → `http://backend:8080`.

---

## Verifying Each Service

### MySQL
```powershell
# Verify MySQL server status
docker compose exec db mysqladmin ping -h localhost -u root -p

# Inspect database tables
docker compose exec db mysql -u $env:DB_USERNAME -p mealsync -e 'SHOW TABLES;'
```

### Backend
```powershell
# Registration
Invoke-RestMethod -Uri http://localhost:8080/api/auth/register `
  -Method POST -ContentType "application/json" `
  -Body '{"name":"Test","email":"test@spit.edu","password":"test123"}'

# Login
Invoke-RestMethod -Uri http://localhost:8080/api/auth/login `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"test@spit.edu","password":"test123"}'
```

### Frontend
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Prometheus
Open [http://localhost:9090](http://localhost:9090) → Status → Targets  
All configured targets should be in state `UP`.

### Grafana
Open [http://localhost:3001](http://localhost:3001)  
Login with `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`.  
Navigate to **Dashboards → MealSync — Container & Application Metrics**.

---

## Inspecting Logs

```powershell
# All services
docker compose logs -f

# Single service
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f prometheus

# Last 100 lines
docker compose logs --tail=100 backend
```

---

## Stopping the Stack (data preserved)

```powershell
# Stop containers — named volumes (database, Prometheus, Grafana data) are preserved
docker compose down

# To also delete volumes (DESTRUCTIVE — deletes all database data):
# docker compose down -v   ← do NOT run this unless you intend to wipe the DB
```

---

## ⚠️ Known Blockers — Action Required from Meet

### 1. Database Driver Mismatch (Blocker for Meet)

**MySQL 8.4** is the agreed final database for the project.  
The infrastructure layer (`docker-compose.yml`, `k8s/`, and Terraform/Ansible) is now configured for **MySQL 8.4** on port 3306.

However, the current uncommitted backend working tree in git still contains the PostgreSQL JDBC driver (`org.postgresql:postgresql` in `pom.xml`) and `PostgreSQLDialect` in `application.yml`.

Meet must complete the backend change in `backend/pom.xml`:

```xml
<!-- backend/pom.xml — replace the postgresql dependency with: -->
<dependency>
  <groupId>com.mysql</groupId>
  <artifactId>mysql-connector-j</artifactId>
  <scope>runtime</scope>
</dependency>
```

And in `backend/src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
```

And in `docker-compose.yml`, change the `db` service:
```yaml
db:
  image: mysql:8.4
  environment:
    MYSQL_DATABASE:      ${DB_NAME:-mealsync}
    MYSQL_USER:          ${DB_USERNAME}
    MYSQL_PASSWORD:      ${DB_PASSWORD}
    MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "${DB_USERNAME}", "-p${DB_PASSWORD}"]
```

And change the backend `DB_URL` in docker-compose.yml:
```yaml
DB_URL: jdbc:mysql://db:3306/${DB_NAME:-mealsync}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
```

### 2. Spring Boot Actuator / Prometheus Metrics

Application-level metrics (HTTP request rates, JVM memory, etc.) require two dependencies Meet must add to `backend/pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-registry-prometheus</artifactId>
  <scope>runtime</scope>
</dependency>
```

And in `backend/src/main/resources/application.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
      base-path: /actuator
  endpoint:
    health:
      show-details: never
  metrics:
    export:
      prometheus:
        enabled: true
```

After this, uncomment the `mealsync-backend` job in `infra/prometheus/prometheus.yml`.

### 3. Backend Health Check

The Dockerfile uses a TCP-level health check because there is no `/actuator/health` endpoint yet.  
Once Actuator is added, update the `HEALTHCHECK` in `backend/Dockerfile` to:
```dockerfile
HEALTHCHECK --interval=20s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1
```

---

## What Works Without Meet's Changes

| Feature | Status |
|---|---|
| Frontend image build (Vite → Nginx) | ✅ Fully works |
| Backend image build (Maven → JRE) | ✅ Builds (Runtime DB connection requires Meet's driver update) |
| MySQL 8.4 container + persistence | ✅ Configured and ready in Compose & Kubernetes |
| Prometheus container + cAdvisor scraping | ✅ Container metrics available immediately |
| Grafana auto-provisioned datasource + dashboard | ✅ Container panels work; app panels show "No data" |
| Spring Boot Actuator metrics | ❌ Requires Meet's pom.xml & security change |
| MySQL backend driver alignment | ❌ Requires Meet's pom.xml & application.yml change |

---

## File Structure Added in This Milestone

```
MealSync/
├── docker-compose.yml          # Root Compose stack
├── .env.example                # Safe secrets template
├── .gitignore                  # Updated
├── backend/
│   └── Dockerfile              # Multi-stage: Maven → JRE 17
├── frontend/
│   ├── Dockerfile              # Multi-stage: Node → Nginx
│   └── nginx.conf              # Nginx: SPA, /api proxy, /health
├── infra/
│   ├── prometheus/
│   │   └── prometheus.yml      # Scrape config
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml
│           └── dashboards/
│               ├── dashboards.yml
│               └── mealsync-overview.json
└── docs/
    └── DOCKER.md               # This file
```
