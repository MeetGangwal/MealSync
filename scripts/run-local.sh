#!/usr/bin/env bash
# ==============================================================================
# Run MealSync locally with Docker Compose (MySQL + Spring Boot + nginx frontend,
# plus Prometheus/Grafana/cAdvisor) and wait until the app answers.
#
# Usage:  scripts/run-local.sh            build changed images and start everything
#         scripts/run-local.sh --logs     same, then follow backend + frontend logs
#
# Data is kept: this never removes containers' volumes. Stop with `docker compose stop`.
# Requires Docker and a .env file (copy .env.example and fill in the secrets).
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed or not on PATH."; exit 2; }
docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop and try again."; exit 2; }
[ -f .env ] || { echo "Missing .env — copy .env.example to .env and set the passwords and JWT secret."; exit 2; }

# Host ports only (never print other .env values)
port() { grep -E "^$1=" .env | tail -1 | cut -d= -f2 | tr -d '[:space:]"' || true; }
FRONTEND_PORT="$(port FRONTEND_HOST_PORT)"; FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="$(port BACKEND_HOST_PORT)"; BACKEND_PORT="${BACKEND_PORT:-8080}"
GRAFANA_PORT="$(port GRAFANA_HOST_PORT)"; GRAFANA_PORT="${GRAFANA_PORT:-3001}"

echo "Building and starting MealSync…"
docker compose up -d --build

echo "Waiting for the backend and frontend health checks…"
for i in $(seq 1 90); do
  backend="$(docker inspect -f '{{.State.Health.Status}}' mealsync-backend 2>/dev/null || echo missing)"
  frontend="$(docker inspect -f '{{.State.Health.Status}}' mealsync-frontend 2>/dev/null || echo missing)"
  if [ "$backend" = healthy ] && [ "$frontend" = healthy ]; then
    echo
    echo "MealSync is running:"
    echo "  App (frontend + /api)  http://localhost:${FRONTEND_PORT}"
    echo "  Backend API (direct)   http://localhost:${BACKEND_PORT}/api/meals"
    echo "  Grafana                http://localhost:${GRAFANA_PORT}"
    [ "${1:-}" = "--logs" ] && exec docker compose logs -f backend frontend
    exit 0
  fi
  sleep 2
done

echo "The app did not become healthy within 3 minutes. Recent backend logs:"
docker compose logs --tail 40 backend
exit 1
