# MealSync — Smart Campus Mess Platform

## Team
- **Meet Gangwal** — Backend, Spring Boot, Security, API
- **Aryan Dandekar** — Cloud Infrastructure, Docker, Kubernetes, Ansible, Prometheus, Grafana

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.2.3, Java 17, Maven |
| Security | Spring Security, JWT (JJWT 0.11.5), BCrypt |
| Database | MySQL 8, Spring Data JPA/Hibernate |
| Frontend | React 19, Vite, React Router |
| DevOps (Aryan) | Docker, Kubernetes, Ansible, Prometheus, Grafana |

---

## Prerequisites
- Java 17+
- Maven 3.8+
- MySQL 8.x
- Node.js 20+ and npm

---

## Database Setup (Local)

```sql
-- Connect to MySQL as root
CREATE DATABASE IF NOT EXISTS mealsync;
-- (Optional but recommended for production) create a least-privilege app user:
-- CREATE USER 'mealsync_app'@'localhost' IDENTIFIED BY 'strong_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mealsync.* TO 'mealsync_app'@'localhost';
-- FLUSH PRIVILEGES;
```

Hibernate `ddl-auto: update` creates tables automatically on first startup.

---

## Environment Variables

Copy `.env.example` and fill in your values. **Never commit a file with real secrets.**

```bash
# Generate a strong JWT secret
openssl rand -base64 32

# Set before starting the backend
export SPRING_DATASOURCE_PASSWORD='your_mysql_password'
export JWT_SECRET='your_generated_secret_here'
```

Variable | Description
---------|------------
`SPRING_DATASOURCE_PASSWORD` | MySQL password (required — no fallback)
`JWT_SECRET` | JWT signing secret, ≥ 32 characters

---

## Running Locally

### Backend
```bash
cd backend

# Set environment variables first (see above)
export SPRING_DATASOURCE_PASSWORD='...'
export JWT_SECRET='...'

./mvnw spring-boot:run
# Starts on http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Starts on http://localhost:5173
# Vite proxy forwards /api/* to http://localhost:8080
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user (ROLE_USER always assigned) |
| POST | `/api/auth/login` | Public | Login → returns JWT + user info |
| GET | `/api/meals` | Public | Browse available meals |
| GET | `/api/orders/user/{id}` | JWT required | Get own orders (403 for others) |
| POST | `/api/orders` | JWT required | Place an order |

### Authentication
All protected endpoints require:
```
Authorization: Bearer <your_jwt_token>
```

### Example: Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
# Response: { "token": "eyJ...", "userId": 1, "name": "Your Name", "email": "...", "role": "ROLE_USER" }
```

---

## Running Tests

```bash
cd backend
./mvnw test

# Full build with tests
./mvnw clean verify
```

Tests use Mockito — **no real database connection required**.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Could not autowire... SPRING_DATASOURCE_PASSWORD` | Env var not set | `export SPRING_DATASOURCE_PASSWORD='...'` |
| `JWT_SECRET: Could not resolve placeholder` | Env var not set | `export JWT_SECRET='...'` |
| `401 Unauthorized` on orders | Missing/invalid JWT | Login first, use token in Authorization header |
| `403 Forbidden` on orders | Accessing another user's orders | Only own userId allowed |
| `409 Conflict` on register | Email already registered | Use a different email |

---

## Infrastructure Integration (Aryan's Work)

The backend exposes the following integration points for Aryan:

| Concern | Details |
|---------|---------|
| **Health endpoint** | Add `spring-boot-starter-actuator` → `/actuator/health` |
| **Prometheus metrics** | Add `micrometer-registry-prometheus` → `/actuator/prometheus` |
| **Port** | Backend: `8080`, Frontend: `5173` |
| **Environment vars** | `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET` (inject via K8s Secrets) |
| **DB URL pattern** | `jdbc:mysql://<host>:3306/mealsync?useSSL=true&serverTimezone=UTC` |
| **CORS** | Currently `http://localhost:5173` — update `SecurityConfig.corsConfigurationSource()` for deployed frontend URL |
| **Docker** | App needs Java 17 runtime; requires env vars at container startup |
| **Kubernetes Secrets** | Map `SPRING_DATASOURCE_PASSWORD` and `JWT_SECRET` from K8s Secret |

---

## Security Notes
- Passwords: BCrypt with 10 rounds (OWASP compliant)
- JWT: HS256, 24h expiry, signed with secret from env var
- Role: always forced to `ROLE_USER` server-side on registration
- Insecure password reset endpoint removed — secure flow TBD
- CORS: restricted to `http://localhost:5173` (update for deployment)
- Frontend stores JWT in `sessionStorage` (XSS risk acknowledged — upgrade to HttpOnly cookie for production)
