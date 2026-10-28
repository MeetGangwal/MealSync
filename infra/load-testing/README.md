# MealSync — Load Testing

Tools for measuring throughput and latency of the running stack. Run them only against your
own local stack (Compose or the local Kubernetes cluster), never against shared systems.

## What the k6 script exercises

`k6-test.js` follows the real request path **browser → Nginx → `/api` proxy → Spring Boot → MySQL**:

| Endpoint | Purpose | Threshold (p95) |
|---|---|---|
| `GET /health`, `GET /` | Nginx and the SPA shell | < 200 ms |
| `GET /api/meals` | Public, database-backed menu | < 500 ms |
| `GET /api/auth/me` | JWT-authenticated request | < 500 ms |

Overall: errors < 1 %, checks > 99 %. `setup()` registers **one** throwaway student with a
random password; no orders are placed, so meal stock is untouched.

Options (environment variables): `BASE_URL` (default `http://localhost:3080`), `VUS`
(default 10), `DURATION` of the steady phase (default `15s`). Total run = 5 s ramp-up +
`DURATION` + 5 s ramp-down.

## Run with Docker (no k6 install)

On Docker Desktop (Windows/macOS) the container reaches host ports via `host.docker.internal`:

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal:3080 -e VUS=20 -e DURATION=30s \
  grafana/k6:1.3.0 run - < infra/load-testing/k6-test.js
```

On Linux (and in CI) use the host network instead:

```bash
docker run --rm -i --network host -e BASE_URL=http://localhost:3000 \
  grafana/k6:1.3.0 run - < infra/load-testing/k6-test.js
```

Kubernetes (NodePort): `-e BASE_URL=http://host.docker.internal:30080`.

Recorded result (Compose, 20 VUs): 12 938 requests, 0 % errors, p95 `/api/meals` 13.4 ms,
p95 `/api/auth/me` 16.4 ms — see [docs/VERIFICATION.md](../../docs/VERIFICATION.md#5-load-test-k6-compose).

Watch the effect live in Grafana (request rate, p95 latency, CPU, DB pool panels).

## Standalone Python load tester

Standard-library only (`urllib`, `concurrent.futures`), useful for quick single-URL tests:

```bash
python infra/load-testing/load_test.py --url http://localhost:3080/health -c 10 -d 10
python infra/load-testing/load_test.py --url http://localhost:3080/api/meals -c 25 -d 20
```

## Autoscaling (HPA) experiment — requires metrics-server

`k8s/07-hpa.yaml` scales the backend between 1 and 3 replicas at 70 % CPU. Docker Desktop
does not include metrics-server, so the HPA shows `cpu: <unknown>` until it is installed.
With metrics-server present:

```bash
kubectl get hpa -n mealsync -w            # in one terminal
docker run --rm -i -e BASE_URL=http://host.docker.internal:30080 -e VUS=50 -e DURATION=120s \
  grafana/k6:1.3.0 run - < infra/load-testing/k6-test.js
```
