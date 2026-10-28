# MealSync — Smart Campus Mess Platform

## Team
- **Meet Gangwal** — Backend, Spring Boot, Security, API
- **Aryan Dandekar** — Cloud Infrastructure, Docker, Kubernetes, Ansible, Prometheus, Grafana

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2.3, Java 17, Maven (wrapper included) |
| Security | Spring Security, JWT (JJWT 0.11.5, HS256), BCrypt |
| Database | MySQL 8.4, Spring Data JPA/Hibernate |
| Frontend | React 19, Vite, React Router; served by Nginx in containers |
| Observability | Spring Boot Actuator + Micrometer, Prometheus, Grafana, cAdvisor |
| DevOps | Docker Compose, Kubernetes (local: Docker Desktop), Ansible, Terraform (validation only), GitHub Actions, k6 |

---

## Quick start (Docker Compose — recommended)

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env      # then replace every CHANGE_ME value (never commit .env)
docker compose up -d --build
bash scripts/smoke-test.sh http://localhost:3000   # 22 end-to-end checks
```

| Service | URL (defaults; override the *_HOST_PORT values in `.env`) |
|---------|-----|
| Frontend (also proxies `/api`) | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Grafana | http://localhost:3001 (admin / `GRAFANA_ADMIN_PASSWORD`) |
| Prometheus | http://localhost:9090 |

Details: [docs/DOCKER.md](docs/DOCKER.md). Kubernetes: [k8s/README.md](k8s/README.md).
Overall infrastructure and what was verified: [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md),
[docs/VERIFICATION.md](docs/VERIFICATION.md).

---

## Environment Variables

One convention (`DB_*`) is used by the backend, Docker Compose, Kubernetes and Ansible.
See [.env.example](.env.example) for the full list.

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | MySQL location (defaults `localhost`, `3306`, `mealsync`; Compose sets `DB_HOST=db`, Kubernetes `DB_HOST=mysql`) |
| `DB_USERNAME`, `DB_PASSWORD` | Application database user |
| `DB_ROOT_PASSWORD` | MySQL root password (container initialisation only) |
| `JWT_SECRET` | JWT signing key, at least 32 bytes (`openssl rand -hex 32`) |
| `JWT_EXPIRATION_MS` | Token lifetime (default `86400000` = 24 h) |
| `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD` | Grafana login |
| `MEALSYNC_SEED_DEMO_USERS` | `false` by default; `true` creates two demo accounts (local demos only) |
| `MEALSYNC_DEMO_STUDENT_PASSWORD`, `MEALSYNC_DEMO_ADMIN_PASSWORD` | Passwords for those demo accounts (required when seeding is enabled) |

---

## Running Locally without Docker

### Backend
Needs a MySQL 8.x server with a `mealsync` database and user.

```bash
# from the repository root: loads ./.env (or backend/.env) and starts the backend
bash scripts/start-backend.sh
# or manually:
cd backend
export DB_USERNAME='...' DB_PASSWORD='...' JWT_SECRET='...'
./mvnw spring-boot:run          # http://localhost:8080, health on :8081/actuator/health
```

Hibernate `ddl-auto: update` creates the tables on first start; the meal catalogue is seeded
automatically (idempotent, safe with several replicas).

### Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173 — the Vite proxy forwards /api/* to http://localhost:8080
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register (role always `ROLE_USER`) |
| POST | `/api/auth/login` | Public | Login → JWT + user info |
| GET | `/api/auth/me` | JWT | Current user profile |
| PUT | `/api/auth/profile` | JWT | Update name / phone / UID |
| GET | `/api/meals` | Public | Browse meals |
| POST | `/api/orders` | Student JWT | Place an order (idempotency key supported) |
| GET | `/api/orders/user/{id}` | Student JWT | Own orders only |
| PUT | `/api/orders/{id}/cancel` | JWT | Cancel own order (admins: any) |
| GET | `/api/payments/methods` | Public | Simulated payment methods |
| * | `/api/admin/**` | Admin JWT | Products, orders, overview, counter sales, payments |

Protected endpoints require `Authorization: Bearer <token>`.

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"<your password>"}'
# { "token": "eyJ...", "userId": 1, "name": "...", "email": "...", "role": "ROLE_USER" }
```

Operational endpoints (internal management port **8081**, never published publicly):
`/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`, `/actuator/prometheus`.

---

## Running Tests

```bash
cd backend
./mvnw clean verify        # Windows: mvnw.cmd clean verify
```

- Unit and controller tests use Mockito / MockMvc (no database).
- Integration tests (`com.mealsync.integration`) start **MySQL 8.4 with Testcontainers**, so
  **Docker must be running**. They cover the `DB_*` datasource settings, register/login/`/me`,
  role checks, Actuator on the management port, opt-in demo seeding and concurrent seeding.

Frontend: `cd frontend && npm ci && npm run lint && npm run build`.
End-to-end against a running stack: `bash scripts/smoke-test.sh <frontend URL>`.
Load test: see [infra/load-testing/README.md](infra/load-testing/README.md).

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `required variable ... is missing a value` (Compose) | `.env` missing or incomplete | `cp .env.example .env` and fill in values |
| `Could not resolve placeholder 'JWT_SECRET'` | Env var not set | Set `JWT_SECRET` (≥ 32 bytes) |
| `JWT signing secret is too weak` | `JWT_SECRET` shorter than 32 bytes | `openssl rand -hex 32` |
| `Communications link failure` | MySQL not reachable | Check `DB_HOST`/`DB_PORT` and that MySQL is up |
| Integration tests fail to start | Docker not running | Start Docker Desktop |
| `401 Unauthorized` | Missing/invalid/expired JWT | Log in again |
| `403 Forbidden` | Wrong role or another user's resource | — |
| `409 Conflict` on register | Email already registered | Use another email |

---

## Security Notes
- Passwords: BCrypt (strength 10); passwords longer than 72 characters are rejected
- JWT: HS256, 24 h expiry, secret from the environment; secrets and tokens are never logged
- Registration always assigns `ROLE_USER`; admin endpoints require `ROLE_ADMIN`
- No credentials are bundled in the frontend; demo accounts exist only when explicitly enabled
- Insecure password-reset endpoint removed — a token-based flow is still to be built
- CORS allows localhost development origins; in containers the frontend calls `/api` on the same origin
- Frontend keeps the JWT in `sessionStorage` (XSS risk acknowledged — HttpOnly cookies would be stronger)
- Credentials that were committed in early history must be treated as compromised and rotated
