# MealSync — Permanent Development Rules & Engineering Standards

This document establishes the permanent operational and development rules for all engineers and AI pair programmers working on the **MealSync** project.

## 1. Safety & Architecture Integrity
- **Inspect before editing**: Always read relevant files, configurations, and running processes before making changes.
- **Small, targeted, reversible changes**: Avoid mass file rewrites or uncontrolled refactoring.
- **Never use destructive Git commands**: Never run `git reset --hard`, `git clean -f`, or revert uncommitted changes without explicit approval.
- **Never drop or wipe the database**: Never run `DROP DATABASE`, `TRUNCATE TABLE`, or recreate tables to resolve an application bug. Preserve existing users, orders, and payment records.
- **Never weaken authorization**: Never make protected endpoints public or bypass JWT checks to hide a `401 Unauthorized` or `403 Forbidden` response.
- **No hardcoded secrets**: Never commit hardcoded passwords, database credentials, JWT secrets, or sensitive tokens to version control. Use `.env` or system environment variables.
- **Preserve modular monolith architecture**: The project is a Spring Boot 3 + React 19 + MySQL application. Do not introduce microservices or unauthorized third-party libraries.

## 2. Testing & Quality Assurance
- **Regression testing**: Run relevant tests after each meaningful change.
- **Full verification**: Run the full Maven test suite (`./mvnw test`) and frontend production build (`npm run build`) before concluding any milestone.
- **Report actual results**: Report actual terminal output and verified behaviors, never assumed or hypothetical outcomes.
- **No false claims**: Do not claim an automated browser workflow or UI test was executed unless verified.

## 3. Team Responsibilities & Work Boundaries
- **Meet (Application Lead)**:
  - React frontend (UI/UX, state, responsive layouts, theme switching, checkout, profiles, POS).
  - Spring Boot backend (controllers, business logic, entities, DTOs, security, JPA repositories).
  - MySQL database schema, relationships, and data integrity.
  - End-to-end integration and API verification.
- **Aryan (Cloud & DevOps Lead)**:
  - Docker and Docker Compose configuration.
  - Kubernetes manifests (Deployments, Services, Ingress, HPA).
  - Prometheus metrics scraping and Grafana dashboards.
  - AWS Terraform infrastructure and Ansible playbooks.
  - CI/CD automation pipelines via GitHub Actions.

## 4. Process Management & Startup Rules
- **Check before launching**: Always check whether the backend or frontend is already running before attempting to launch it (`lsof -i :8080`, `lsof -i :5173`).
- **Use the startup script**: Always use `./scripts/start-backend.sh` rather than running `./mvnw spring-boot:run` in multiple terminal windows.
- **Reuse healthy instances**: If a healthy backend is already running and responding (`GET /api/meals` returns 200), reuse it rather than restarting or spawning duplicates.
- **Never kill unidentified processes**: Never run automatic or indiscriminate `kill` or `killall` commands against port 8080 or Java processes without inspecting their PID, command line, and owner.
- **Never change ports without evidence**: Keep the backend on port 8080. Do not alter port configurations to bypass port conflicts.
- **Regression testing discipline**: Run unit/integration tests (`./mvnw test`) and the frontend production build (`npm run build`) whenever authentication, configuration, or API routes are modified.

