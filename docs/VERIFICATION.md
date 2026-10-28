# MealSync — Verification, Demonstration & Evidence Guide

> **Milestone 3** · Branch: `feat/cloud-native-deployment`  
> **Infrastructure & DevOps Owner**: Aryan Sagar Dandekar  
> **Application Owner**: Meet Gangwal (Frontend, Backend, Database)

---

## 1. Overview of Verification Strategy

This guide outlines the exact commands, verification steps, and evidence collection required for project demonstration, academic submission, and team integration.

It distinguishes between:
1. **Executed & Verified Live in this Workspace**: Tests and builds that were executed directly on the system with verified measurements.
2. **Cluster Demonstration Scenarios**: Steps for demonstrating Kubernetes self-healing, HPA autoscaling, and database persistence once Minikube or Docker Desktop Kubernetes is running.
3. **Evidence Checklist**: The exact screenshots and terminal outputs to capture for the final project report.

---

## 2. Real Evidence Captured from Workspace Execution

### Evidence 1: Python Multi-Threaded Load Test (Target: Frontend /health)
Executed on `2026-10-27` using `infra/load-testing/load_test.py`:

```
======================================================================
MealSync Load Test Execution
======================================================================
Target URL:    http://localhost:3080/health
Concurrency:   10 worker threads
Duration:      10.01 seconds
Timeout:       5.0s per request
----------------------------------------------------------------------
Total Requests:     5,460
Successful (2xx):   5,460
Failed / Errors:    0
Error Rate:         0.00%
Throughput (RPS):   545.35 req/sec
----------------------------------------------------------------------
Latency Percentiles (ms):
  Min:              2.38 ms
  Mean:             18.31 ms
  Median (p50):     16.06 ms
  90th percentile:  29.48 ms
  95th percentile:  38.10 ms
  99th percentile:  54.56 ms
  Max:              143.07 ms
======================================================================
```

| Concurrency | Total Requests | RPS (Throughput) | Error Rate | Mean Latency | p95 Latency | p99 Latency |
|---|---|---|---|---|---|---|
| **10 VUs** | **5,460** | **545.4 req/s** | **0.00%** | **18.31 ms** | **38.10 ms** | **54.56 ms** |

---

### Evidence 2: Grafana k6 Container Load Test (Target: /health + /)
Executed on `2026-10-27` using `grafana/k6:latest` container:

```
          /\      Grafana   /‾‾/  
     /\  /  \     |\  __   /  /   
    /  \/    \    | |/ /  /   ‾‾\ 
   /          \   |   (  |  (‾)  |
  / __________ \  |_|\_\  \_____/ 

  execution: local (script: k6-test.js)
  scenarios: 10 max VUs over 25s (5s ramp-up, 15s steady state, 5s ramp-down)

  █ THRESHOLDS 
    ✓ 'p(95)<200' p(95)=4.07ms
    ✓ 'p(99)<400' p(99)=6.64ms
    ✓ 'rate<0.01' rate=0.00%

  █ TOTAL RESULTS 
    checks_total.......: 2967 (100.00% succeeded, 0 failed)
    ✓ health status is 200
    ✓ health response body is ok
    ✓ root status is 200

    HTTP
    http_req_duration: avg=2.22ms  min=596.67µs med=2.03ms max=12.1ms p(90)=3.25ms p(95)=4.07ms p(99)=6.64ms
    http_req_failed..: 0.00% (0 out of 1978 requests failed)
    http_reqs........: 1978 (84.75 req/sec with 200ms pacing)
```

---

### Evidence 3: Multi-Stage Docker Image Build Sizes
```
IMAGE                      ID             DISK USAGE   CONTENT SIZE
mealsync-backend:latest    8caca0de3f4d   447MB        158MB
mealsync-frontend:latest   6d8ccf066e85   74.7MB       21.2MB
```
*Frontend image is only 21.2MB using Alpine Nginx. Backend image is 158MB using Alpine Temurin JRE 17 with multi-stage build.*

---

## 3. Demonstration Scenarios & Terminal Commands

### Scenario A: Local Container Startup & Reachability
```bash
# 1. Copy environment template
cp .env.example .env
# Fill in DB_PASSWORD, JWT_SECRET, GRAFANA_ADMIN_PASSWORD

# 2. Start stack in detached mode
docker compose up -d

# 3. Verify container health
docker compose ps

# 4. Test Reachability:
# Frontend Web UI
curl -i http://localhost:3000/health
# Prometheus Dashboard
curl -i http://localhost:9090/-/ready
# Grafana UI
curl -i http://localhost:3001/api/health
```

---

### Scenario B: Database Persistence Across Container Restarts
Demonstrates that data stored in named volumes / PVCs survives container destruction:

```bash
# 1. Verify existing data volume
docker volume ls --filter "name=mealsync"

# 2. Insert test record into MySQL container
docker compose exec db mysql -u mealsync_user -p mealsync -e "CREATE TABLE IF NOT EXISTS demo_persist (id INT PRIMARY KEY, message VARCHAR(50)); INSERT INTO demo_persist VALUES (1, 'Cloud Native Storage Test');"

# 3. Stop and remove containers completely
docker compose down

# 4. Restart database container
docker compose up -d db

# 5. Verify the data persisted across container teardown
docker compose exec db mysql -u mealsync_user -p mealsync -e "SELECT * FROM demo_persist;"
```

---

### Scenario C: Kubernetes Self-Healing & Pod Recovery
Demonstrates declarative replica management and resilience against failure:

```bash
# 1. List active pods
kubectl get pods -n mealsync

# 2. Note the name of one backend pod (e.g., mealsync-backend-67df76f499-abcde)
# Delete the pod abruptly:
kubectl delete pod mealsync-backend-<POD_ID> -n mealsync

# 3. Watch the Kubernetes ReplicaSet instantly recreate a new pod to maintain the desired count of 2:
kubectl get pods -n mealsync -w
```

---

### Scenario D: Horizontal Pod Autoscaler (HPA) Demonstration
Demonstrates automated elasticity under load:

```bash
# 1. Ensure metrics-server is active
kubectl top pods -n mealsync

# 2. Inspect initial HPA status (min: 1, max: 3 replicas)
kubectl get hpa -n mealsync

# 3. In a separate terminal, launch a load test against the NodePort endpoint:
python infra/load-testing/load_test.py --url http://localhost:30080/health -c 30 -d 60

# 4. Watch HPA increase replicas from 1 -> 2 -> 3 as CPU exceeds 70%:
kubectl get hpa -n mealsync -w
kubectl get pods -n mealsync -l app.kubernetes.io/name=backend
```

---

### Scenario E: Prometheus Scrape Targets & Grafana Dashboard
1. Open Prometheus targets: `http://localhost:9090/targets`
   - Verify `prometheus` job is `UP`.
   - Verify `mealsync-backend` job is configured (scrapes `backend:8080/actuator/prometheus`).
2. Open Grafana: `http://localhost:3001`
   - Log in with `admin` and `GRAFANA_ADMIN_PASSWORD`.
   - Navigate to **Dashboards → MealSync Overview**.
   - Observe real-time panels for Container CPU, Memory Utilization, and Network I/O.

---

## 4. Evidence Collection Checklist for Project Report

Collect the following screenshots and terminal logs during the demonstration session:

- [ ] **Screenshot 1: Docker Compose Running**: `docker compose ps` showing `mealsync-frontend`, `mealsync-backend`, `mealsync-db`, `mealsync-prometheus`, `mealsync-cadvisor`, and `mealsync-grafana` all in `Up (healthy)` state.
- [ ] **Screenshot 2: Frontend UI in Browser**: Browser window at `http://localhost:3000` showing the React login/landing page.
- [ ] **Screenshot 3: Kubernetes Deployments**: Terminal output of `kubectl get all -n mealsync` showing Deployments, StatefulSet, Services, and PVCs.
- [ ] **Screenshot 4: Self-Healing Pod Recovery**: Terminal recording showing a deleted pod terminating and a replacement immediately entering `Running` state.
- [ ] **Screenshot 5: HPA Scaling in Action**: Terminal showing `kubectl get hpa -n mealsync` with replica count scaling up during load test execution.
- [ ] **Screenshot 6: Grafana Dashboard**: Browser window at `http://localhost:3001` displaying the MealSync Overview dashboard with active CPU, memory, and container traffic graphs.
- [ ] **Screenshot 7: GitHub Actions CI Green Checkmarks**: GitHub repo **Actions** tab showing `Frontend Build & Lint`, `Backend Compile & Package`, `Infrastructure Manifest Validation`, and `Docker Image Builds` with all green ticks.
- [ ] **Screenshot 8: Load Test Performance Table**: Terminal output of `python infra/load-testing/load_test.py` showing throughput, zero errors, and sub-40ms p95 latency.
