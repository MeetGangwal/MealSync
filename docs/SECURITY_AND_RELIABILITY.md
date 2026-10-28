# MealSync — Security & Reliability Review Report

> **Milestone 3** · Branch: `feat/cloud-native-deployment`  
> **Infrastructure & DevOps Owner**: Aryan Sagar Dandekar  
> **Application Owner**: Meet Gangwal (Frontend, Backend, Database)

---

## 1. Security Audit Matrix

| Security Domain | Vulnerability Risk Checked | Implemented Countermeasure | Status |
|---|---|---|---|
| **Credentials in Git** | Plaintext secrets in version control | `.env`, `02-secret.yaml`, `*.tfstate`, `*.tfvars`, `.vault-pass` strictly git-ignored; safe `.example` templates only. | ✅ **Secured** |
| **Container Root User** | Privilege escalation via container breakout | Backend runs as non-root user `mealsync:mealsync` (UID 1000). Kubernetes pods enforce `allowPrivilegeEscalation: false` and drop all Linux capabilities. | ✅ **Secured** |
| **Network Exposure** | Direct access to DB and monitoring from public web | Database port (3306/5432) has NO public route. Monitoring (9090, 8090, 3001) is bound to localhost (127.0.0.1) in Compose and restricted to admin IP in AWS Security Groups. | ✅ **Secured** |
| **Ingress Boundaries** | Internal microservices exposed directly | In Kubernetes, Backend is exposed via internal `ClusterIP: 8080`. Only the Frontend is accessible via Ingress or NodePort 30080. | ✅ **Secured** |
| **Cloud Spending (FinOps)**| Runaway billing from managed clusters & NAT | Designed single-node K3s architecture on EC2 (`t3.small` / `t3.micro`), avoiding >$215/mo EKS and NAT gateway fees. RDS is disabled by default (`enable_rds = false`). | ✅ **Secured** |
| **Storage Persistence** | Data loss upon container recreation | MySQL and PostgreSQL data stored in named Docker volumes (`mealsync-db-data`) and Kubernetes PVCs (`mysql-data`, 2Gi). AWS EBS root volume is encrypted with default KMS. | ✅ **Secured** |
| **CI/CD Supply Chain** | Credential leakage in logs or unauthorized releases | GitHub Actions uses least-privilege `contents: read`. Images are pushed ONLY on main branch push AND only when secrets are present. | ✅ **Secured** |
| **Self-Healing & Downtime**| Single-point-of-failure or broken deployments | Kubernetes Deployments configured with `RollingUpdate` (`maxSurge: 1`, `maxUnavailable: 0`), TCP/HTTP liveness and readiness probes. | ✅ **Secured** |

---

## 2. Infrastructure Fixes Implemented in Milestone 3

1. **Pod Security Hardening (`k8s/04-backend.yaml`)**:
   - Added `securityContext` to pod spec:
     ```yaml
     securityContext:
       runAsNonRoot: true
       runAsUser: 1000
       runAsGroup: 1000
       fsGroup: 1000
     ```
   - Added container capabilities drop:
     ```yaml
     securityContext:
       allowPrivilegeEscalation: false
       capabilities:
         drop:
           - ALL
     ```
2. **Frontend Security Context (`k8s/05-frontend.yaml`)**:
   - Added `securityContext: allowPrivilegeEscalation: false` to prevent child processes from obtaining more privileges than the parent process.
3. **Nginx Upstream Startup Resilience**:
   - Identified that static `proxy_pass http://backend:8080` in Nginx causes an immediate exit if the backend container is not reachable during DNS resolution at startup.
   - For standalone testing, documented `--add-host backend:127.0.0.1` flag.
   - For Kubernetes, ensured `04-backend.yaml` creates the `backend` Service prior to frontend pod creation, and frontend readiness probe prevents traffic routing until healthy.
4. **Enhanced Git Ignore Protection (`.gitignore`)**:
   - Prevented accidental leakage of Kubernetes secret manifests (`k8s/*secret*.yaml`), Terraform state files (`*.tfstate`), and Ansible vault files (`infra/ansible/group_vars/*_vault.yml`).

---

## 3. Action Items for Meet (Backend Application Owner)

The infrastructure layer is complete and hardened. The following application-level enhancements are required from Meet to achieve full end-to-end integration:

1. **Add Spring Boot Actuator**:
   - **File**: `backend/pom.xml`
   - **Dependency**:
     ```xml
     <dependency>
         <groupId>org.springframework.boot</groupId>
         <artifactId>spring-boot-starter-actuator</artifactId>
     </dependency>
     <dependency>
         <groupId>io.micrometer</groupId>
         <artifactId>micrometer-registry-prometheus</artifactId>
     </dependency>
     ```
   - **File**: `backend/src/main/resources/application.yml`
     ```yaml
     management:
       endpoints:
         web:
           exposure:
             include: health, info, prometheus
     ```
   - **File**: `backend/src/main/java/com/mealsync/config/SecurityConfig.java`
     Permit unauthenticated access to health and metrics endpoints:
     ```java
     .requestMatchers("/actuator/**").permitAll()
     ```
   - **Benefit**: Enables Prometheus to scrape JVM memory, GC, and HTTP request metrics, and enables Kubernetes HPA to autoscale backend pods based on application metrics.

2. **Finalize Database Driver Selection**:
   - **Conflict**: Project specification states **MySQL**, but current working tree uses PostgreSQL JDBC driver and dialect.
   - **Fix**: Revert to `mysql-connector-j` and `org.hibernate.dialect.MySQLDialect` in `backend/pom.xml` and `backend/src/main/resources/application.yml`.
   - **Infrastructure Readiness**: Both [`k8s/03-mysql.yaml`](file:///d:/ARYAN/MCA/3.%20SEM%203/CC/Project/MealSync/k8s/03-mysql.yaml) and [`k8s/03-postgres.yaml`](file:///d:/ARYAN/MCA/3.%20SEM%203/CC/Project/MealSync/k8s/03-postgres.yaml) are ready.

---

## 4. Teardown & Rollback Procedures

### Local Container Teardown
```bash
# Stop containers without losing database volume
docker compose down

# Stop containers and destroy database volume
docker compose down -v
```

### Kubernetes Rollback & Teardown
```bash
# Roll back a faulty backend deployment to the previous revision
kubectl rollout undo deployment/mealsync-backend -n mealsync

# Check rollback history
kubectl rollout history deployment/mealsync-backend -n mealsync

# Complete teardown of all MealSync Kubernetes resources
kubectl delete -k k8s/
```

### Terraform Cloud Infrastructure Teardown
```bash
cd infra/terraform
# Destroys EC2 instance, Elastic IP, Security Groups, Subnet, and VPC
terraform destroy -auto-approve
```
