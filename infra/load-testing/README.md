# MealSync — Load Testing Suite

This directory contains the load testing configuration and tools for evaluating the performance, throughput, and autoscaling resilience of the MealSync application.

---

## Load Testing Strategy & Safety Rules

1. **Target Safe Endpoints First**:
   - `GET /health` (Nginx & Spring Boot healthcheck probes)
   - `GET /` (React SPA root index)
   - Do **NOT** flood authentication endpoints (`/api/auth/register`) or create dummy records on production databases.
2. **Local & Isolated Execution**:
   - Always run tests against local container stacks or dedicated staging environments (`http://localhost:3080` or `http://localhost:3000`).
   - Never run unmetered load tests against shared or third-party cloud infrastructure without prior authorization.
3. **Metrics Captured**:
   - Total requests & Request Rate (RPS / Throughput)
   - Error rate (%)
   - Latency distribution: Min, Mean, Median (p50), 90th percentile (p90), 95th percentile (p95), 99th percentile (p99), Max.

---

## Tool 1: Grafana k6 (Cloud-Native Standard)

### Running via Docker (Zero Installation)
If `k6` is not installed on your host system, execute it directly using the official `grafana/k6` container image:

```powershell
# Windows PowerShell:
docker run --rm -i --network=host grafana/k6:latest run -e BASE_URL=http://localhost:3080 - < infra/load-testing/k6-test.js

# Or mounting the file:
docker run --rm -v ${PWD}/infra/load-testing:/test -w /test --network=host grafana/k6:latest run -e BASE_URL=http://localhost:3080 k6-test.js
```

```bash
# Linux / macOS:
docker run --rm -i --network=host grafana/k6:latest run -e BASE_URL=http://localhost:3080 - < infra/load-testing/k6-test.js
```

### Running with Native k6 Binary
```bash
k6 run -e BASE_URL=http://localhost:3080 -e VUS=20 -e DURATION=30s infra/load-testing/k6-test.js
```

---

## Tool 2: Standalone Python Load Tester (Zero Dependencies)

A Python 3 tool using standard library `urllib` and `concurrent.futures`. Requires no external pip packages.

```powershell
# Test Frontend Health endpoint with 10 concurrent clients for 10 seconds:
python infra/load-testing/load_test.py --url http://localhost:3080/health -c 10 -d 10

# Test Frontend SPA root with 25 concurrent clients for 20 seconds:
python infra/load-testing/load_test.py --url http://localhost:3080/ -c 25 -d 20
```

---

## Comparing Performance: Before vs. After Scaling (HPA)

To demonstrate the impact of Kubernetes Horizontal Pod Autoscaler (HPA):

1. **Baseline Test (1 Replica)**:
   ```bash
   kubectl scale deployment/mealsync-backend --replicas=1 -n mealsync
   python infra/load-testing/load_test.py --url http://localhost:30080/health -c 10 -d 30
   ```
   *Record RPS, CPU utilization in Grafana, and p95 latency.*

2. **Autoscaled Test (Under HPA 1–3 Replicas)**:
   ```bash
   kubectl apply -f k8s/07-hpa.yaml
   # Generate steady load for 60 seconds to trigger CPU threshold (>70%)
   python infra/load-testing/load_test.py --url http://localhost:30080/health -c 40 -d 60
   ```
   *Observe HPA scale up pods:*
   ```bash
   kubectl get hpa -n mealsync -w
   ```
   *Notice the latency reduction and throughput increase once replica count increases from 1 to 3.*
