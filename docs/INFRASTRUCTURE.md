# MealSync — Infrastructure Overview

What each part of the DevOps setup is for, how it is used **locally**, and what was actually
verified. Scope decision: **no AWS / no cloud resources** — Terraform is kept for
configuration validation only.

| Area | Where | Status |
|---|---|---|
| Containers | `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf` | Built and running |
| Local stack | `docker-compose.yml`, `.env.example` | **Deployed locally, verified** ([DOCKER.md](DOCKER.md)) |
| Monitoring | `infra/prometheus/`, `infra/grafana/` (Compose); `k8s/08-monitoring.yaml`, `k8s/grafana/` (K8s) | **Verified with real metrics** |
| Kubernetes | `k8s/` (kustomize) | **Deployed to local Docker Desktop cluster, verified** ([k8s/README.md](../k8s/README.md)) |
| Terraform | `infra/terraform/` | **Validated only** (`fmt`, `init -backend=false`, `validate`) — never applied |
| Ansible | `infra/ansible/` | **Syntax-checked and linted** — not run against a host |
| CI | `.github/workflows/ci.yml` | Lint-checked (actionlint); runs on GitHub when pushed |
| Load testing | `infra/load-testing/` | **k6 run locally against Compose** |

Verified results with numbers: [VERIFICATION.md](VERIFICATION.md).

---

## Architecture

```
 browser ──► frontend (Nginx :80) ──/api/──► backend (Spring Boot :8080) ──► MySQL 8.4 (:3306)
                                               │ :8081 /actuator/{health,prometheus} (internal)
                                               ▼
                                         Prometheus ◄── cAdvisor (Compose: per-service cgroups)
                                               ▼
                                            Grafana
```

- **One configuration convention** across backend, Compose, Kubernetes and Ansible:
  `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`,
  `JWT_EXPIRATION_MS`, `GRAFANA_ADMIN_*`. Compose sets `DB_HOST=db`; Kubernetes `DB_HOST=mysql`.
- **Database:** MySQL 8.4 everywhere (Compose, Kubernetes, Testcontainers), `utf8mb4`,
  Hibernate `ddl-auto: update`, persistent volume (Compose named volume / K8s PVC).
- **Health and metrics:** Actuator on the internal management port 8081 — only `health`
  (details hidden) and `prometheus` are exposed; the port is never published or routed.
- **Secrets:** only in the git-ignored `.env` (Compose) and the `mealsync-secret` Secret
  (Kubernetes, created from `.env`, never part of the kustomization).

---

## Docker Compose (local)

See [DOCKER.md](DOCKER.md). Key points:
- Start order via healthchecks: MySQL → backend readiness → frontend.
- Required secrets fail fast; host ports are configurable (`*_HOST_PORT` in `.env`).
- Monitoring ports (Prometheus, Grafana, cAdvisor) bind to `127.0.0.1` only.

## Kubernetes (local cluster)

See [k8s/README.md](../k8s/README.md). Key points:
- 2 backend and 2 frontend replicas, MySQL StatefulSet with a 2 Gi PVC.
- Backend waits for MySQL (init container) and uses Actuator startup/liveness/readiness probes.
- Data seeding is serialized across replicas with a MySQL named lock.
- Prometheus discovers each backend pod (namespace-scoped, read-only RBAC); Grafana has a
  provisioned per-pod backend dashboard.
- Frontend reachable on NodePort **30080**. HPA and Ingress are defined but need
  metrics-server / an ingress controller, which Docker Desktop does not ship.

## Terraform — validation only

`infra/terraform/` describes an AWS layout (VPC, security groups, one EC2 host running K3s,
optional RDS MySQL). **It is not used to create anything.** It is checked with:

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false     # downloads the provider plugin only
terraform validate
```
Locally this runs in the `hashicorp/terraform:1.9.8` container; CI runs the same steps.
`terraform plan/apply` need AWS credentials and are intentionally not part of any workflow.

## Ansible — syntax and lint

`infra/ansible/` contains playbooks to bootstrap a Linux host (Docker, K3s, firewall) and
apply the `k8s/` manifests. They are validated, not executed:

```bash
cd infra/ansible
ansible-galaxy collection install -r requirements.yml
for pb in playbooks/*.yml; do ansible-playbook --syntax-check "$pb"; done
ansible-lint --offline playbooks/
```
Locally this runs in a `python:3.12-slim` container with `ansible-core 2.17.7` and
`ansible-lint 24.12.2` (Ansible does not run natively on Windows). To use the playbooks for
real, point `inventory/` at a Linux VM you control.

## CI (GitHub Actions)

`.github/workflows/ci.yml` — no deployment and no cloud access:
1. **Backend:** `./mvnw verify` (unit + MySQL Testcontainers integration tests)
2. **Frontend:** `npm ci`, lint, build
3. **Infrastructure:** Compose config, kustomize + kubeconform, Terraform fmt/validate, Ansible syntax + lint
4. **Docker images:** built, not pushed
5. **End-to-end:** full Compose stack with throwaway secrets, smoke test, Prometheus target check, short k6 run
6. **Publish (optional, off):** pushes to Docker Hub only if the repository variable
   `DOCKERHUB_PUBLISH=true` and secrets `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` are set, on `main`

The former AWS deployment workflow was removed.

## Security and reliability

See [SECURITY_AND_RELIABILITY.md](SECURITY_AND_RELIABILITY.md).
