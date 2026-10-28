#!/usr/bin/env bash
# ==============================================================================
# MealSync Backend Startup Script
# Checks port 8080 health, avoids duplicate startups, loads local environment,
# and gracefully handles process lifecycle.
# ==============================================================================

set -o pipefail

# 1. Resolve Project Root relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
PORT=8080

echo "============================================================"
echo " MealSync Spring Boot Backend Controller"
echo " Project Root: $PROJECT_ROOT"
echo " Target Port:  $PORT"
echo "============================================================"

# 2. Safely load local environment variables from .env if present
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "[CONFIG] Loading environment from $PROJECT_ROOT/.env"
  # Export non-comment lines
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    export "$line"
  done < "$PROJECT_ROOT/.env"
elif [ -f "$BACKEND_DIR/.env" ]; then
  echo "[CONFIG] Loading environment from $BACKEND_DIR/.env"
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    export "$line"
  done < "$BACKEND_DIR/.env"
fi

# Set default username if unset
export SPRING_DATASOURCE_USERNAME="${SPRING_DATASOURCE_USERNAME:-root}"

# Check required database credentials
if [ -z "$SPRING_DATASOURCE_PASSWORD" ]; then
  echo "[WARNING] SPRING_DATASOURCE_PASSWORD is not set. Database connection may fail if MySQL requires a password."
fi

# Check required JWT secret
if [ -z "$JWT_SECRET" ]; then
  echo "[ERROR] JWT_SECRET environment variable is missing."
  echo "Please provide a valid 256-bit (32+ character) secret in .env or your shell environment."
  exit 1
fi

if [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "[ERROR] JWT_SECRET is too short (${#JWT_SECRET} characters: '$JWT_SECRET')."
  echo "JJWT HS256 requires at least 32 characters (256 bits). Please update .env or your shell environment."
  exit 1
fi

# 3. Check whether Port 8080 is currently occupied
PID_ON_PORT=$(lsof -ti :$PORT 2>/dev/null | head -n 1)

if [ -n "$PID_ON_PORT" ]; then
  echo "[CHECK] Port $PORT is currently occupied by PID $PID_ON_PORT."
  
  # Check if it's already a responding MealSync backend
  # /api/meals is a public read-only endpoint that returns 200 on a healthy MealSync instance
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://localhost:$PORT/api/meals" 2>/dev/null || echo "000")
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "------------------------------------------------------------"
    echo "[STATUS] Healthy MealSync backend is ALREADY RUNNING!"
    echo "  - Process ID: $PID_ON_PORT"
    echo "  - Health probe: GET http://localhost:$PORT/api/meals -> HTTP 200 OK"
    echo "  - Duplicate instance startup skipped."
    echo "------------------------------------------------------------"
    exit 0
  else
    echo "------------------------------------------------------------"
    echo "[ALERT] Port $PORT is occupied by an UNKNOWN or UNHEALTHY process!"
    echo "  - Process ID: $PID_ON_PORT"
    echo "  - Health probe response: HTTP $HTTP_STATUS"
    echo ""
    echo "Diagnostic information:"
    ps -p "$PID_ON_PORT" -o pid,user,%cpu,%mem,command 2>/dev/null || lsof -i :$PORT
    echo ""
    echo "Suggested diagnostic commands:"
    echo "  lsof -nP -iTCP:$PORT -sTCP:LISTEN"
    echo "  ps aux | grep $PID_ON_PORT"
    echo ""
    echo "To terminate this process manually if safe:"
    echo "  kill $PID_ON_PORT"
    echo ""
    echo "[REFUSED] MealSync will NOT kill an unidentified process automatically."
    echo "------------------------------------------------------------"
    exit 1
  fi
fi

# 4. Port 8080 is free; verify Maven wrapper
if [ ! -f "$BACKEND_DIR/mvnw" ]; then
  echo "[ERROR] Maven wrapper ($BACKEND_DIR/mvnw) not found."
  exit 1
fi

chmod +x "$BACKEND_DIR/mvnw"

# 5. Start MealSync backend
cd "$BACKEND_DIR"
echo "[START] Port $PORT is free. Starting MealSync Spring Boot backend..."
echo "[START] Press Ctrl+C at any time to gracefully stop the backend."
echo "------------------------------------------------------------"

# Using exec ensures signals (SIGINT / Ctrl+C) are forwarded directly to Maven/Java
exec ./mvnw spring-boot:run
