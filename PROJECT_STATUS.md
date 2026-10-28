# MealSync — Project Status & Implementation Tracking

## Current Snapshot
- **Git Branch**: `feat/meet-application`
- **Application Status**:
  - Spring Boot Backend: Java 17, Spring Boot 3.2.3, Port 8080
  - React Frontend: React 19 + Vite, Port 5173
  - Database: MySQL 8/9 (`mealsync` on localhost:3306)
- **Active User Accounts**:
  - `meet@gmail.com` (User-created student account, ID 52)
  - `meet.student@spit.edu` (User-created student account with live order MS10447, ID 54)
  - `aryan@spit.edu` (Demo student account, ID 1)
  - `admin@spit.mess` (Operational mess admin account, ID 53)

---

## Verified Feature Status

| Module / Feature | Status | Verification Summary |
| :--- | :---: | :--- |
| **JWT Authentication** | **PASSED** | Issues signed HS256 tokens; role enforcement validates `ROLE_USER` and `ROLE_ADMIN`. |
| **Student Order History** | **PASSED** | `/api/orders/user/{id}` returns 200 OK without 401 Unauthorized errors. |
| **Simulated Payment System** | **PASSED** | Demo UPI/Card/Cash payments supported with simulated failure testing mode (`402 Payment Required`). |
| **Order Idempotency** | **PASSED** | Retried requests with identical idempotency keys return existing order without double stock decrement. |
| **Pessimistic Inventory Locking** | **PASSED** | `findByIdForUpdate` with `LockModeType.PESSIMISTIC_WRITE` ensures shared MySQL stock cannot oversell. |
| **Admin Counter Sale (POS)** | **PASSED** | Dedicated Point-of-Sale interface processes walk-in guest sales and registered customer orders with printable receipts. |
| **Payment Records & Customer Lookup** | **PASSED** | Backend endpoint `/api/admin/payment-records` and frontend token key aligned (`authHeaders()`); full search, filter, and drilldown operational. |
| **Profile Editing** | **PASSED** | Authenticated `PUT /api/auth/profile` updates full name, phone number, and UID with persistence. |
| **QR Tickets & Verification** | **PASSED** | QR reference generated from persisted DB orders; displayed in student portal and admin receipts. |
| **Light & Dark Theme Toggle** | **PASSED** | Global theme toggle in Topbar, full CSS variable support in `index.css`, persists across reloads via `localStorage`. |
| **Waste Management Removal** | **PASSED** | Unwanted Wastage Report route, sidebar navigation, and page components completely purged. |
| **Responsive Viewport Layout** | **PASSED** | 100% zoom layout on 1440x900 and 1280x800 screens; independent scrolling for cart summaries and responsive table overflow. |

---

## Verified API Contracts

- `POST /api/auth/login` → Returns `{ token, userId, name, email, role }`
- `POST /api/auth/register` → Registers new student with `ROLE_USER`
- `GET /api/auth/me` → Returns authenticated user profile
- `PUT /api/auth/profile` → Updates user profile (`name`, `phone`, `uid`)
- `GET /api/meals` → Public meal list with current inventory stock
- `POST /api/orders` → Student checkout with simulated payment validation and idempotency
- `GET /api/orders/user/{userId}` → Student's order history
- `POST /api/admin/counter-orders` → Counter sales with cash confirmation and walk-in support
- `GET /api/admin/customers/search?query=...` → Registered student lookup
- `GET /api/admin/payment-records` → Transaction records with search and status/source filters

---

## Verification Test Results

- **Backend Unit & Integration Tests**: 73 tests passed, 0 failures, 0 skipped (`./mvnw test` -> `BUILD SUCCESS`)
  - `SecurityConfigTest`: 9/9 passed
  - `JwtUtilsTest`: 10/10 passed
  - `AuthControllerTest`: 11/11 passed
  - `OrderControllerTest`: 14/14 passed
  - `AdminControllerTest`: 13/13 passed
  - `UserServiceTest`: 11/11 passed
  - `PaymentServiceTest`: 5/5 passed
- **Frontend Production Build**: `npm run build` completed successfully (`dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`)
- **End-to-End Scenarios**: All 14 automated steps in `scratch/e2e_verification.sh` passed against live MySQL database.

---

## Database User Audit & Safety Record

- **User Accounts Preserved**:
  - `meet@gmail.com` (ID 52) — Meet's primary student user account (Preserved intact)
  - `meet.student@spit.edu` (ID 54) — User student account with live order `MS10447` (Preserved intact)
  - `aryan@spit.edu` (ID 1) — Registered demo student account for automated tests (Preserved intact)
  - `admin@spit.mess` (ID 53) — Mess operational admin account with `ROLE_ADMIN` (Preserved intact)
- **Data Safety**:
  - No database tables were dropped, truncated, or recreated.
  - Foreign key integrity was maintained across `users`, `meals`, `orders`, and `order_items`.
  - `DataSeeder.java` is guarded by `@Value("${mealsync.seed.demo-users:true}")` to prevent unwanted reseeding in production.

---

## Interface Agreement with Aryan (Cloud/DevOps Lead)

| Category | Requirement / Interface |
| :--- | :--- |
| **Backend Port** | `8080` (HTTP) |
| **Frontend Port** | `5173` (Vite dev server) / Nginx port `80` (Docker production) |
| **Database Target** | MySQL 8.x / 9.x, database `mealsync` on port `3306` |
| **Environment Variables (Backend)** | `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`, `MEALSYNC_SEED_DEMO_USERS` |
| **Environment Variables (Frontend)** | `VITE_API_URL` (optional, default uses `/api` proxy or same-origin) |
| **Health Check Endpoint** | `GET /actuator/health` or `GET /api/meals` |
| **Prometheus Metrics** | `GET /actuator/prometheus` (Spring Boot Actuator) |
| **Database Migrations** | Hibernate `ddl-auto: update` configured with `MySQLDialect` |

