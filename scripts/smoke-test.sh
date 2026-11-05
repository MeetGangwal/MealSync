#!/usr/bin/env bash
# ==============================================================================
# MealSync end-to-end smoke test (frontend -> nginx /api proxy -> backend -> MySQL)
#
# Usage:  scripts/smoke-test.sh [BASE_URL]      (default: http://localhost:3000)
# Creates a throwaway student account with a random password, places and
# cancels one order. Prints no secrets. Exit code 0 = all checks passed.
# Requires: bash, curl, python3 (for JSON parsing).
# ==============================================================================
set -uo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
# First interpreter that actually runs (on Windows "python3" can be a Store placeholder)
PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import json' >/dev/null 2>&1; then
    PY="$candidate"; break
  fi
done
[ -n "$PY" ] || { echo "python3/python is required"; exit 2; }
PASS=0
FAIL=0
BODY="$(mktemp)"
# Git Bash on Windows: use a C:/... path so native curl/python can open the file too
command -v cygpath >/dev/null 2>&1 && BODY="$(cygpath -m "$BODY")"
trap 'rm -f "$BODY"' EXIT

check() { # name, expected, actual
  if [ "$2" = "$3" ]; then PASS=$((PASS + 1)); echo "  PASS  $1 ($3)"
  else FAIL=$((FAIL + 1)); echo "  FAIL  $1 (expected $2, got $3)"; echo "        response: $(head -c 200 "$BODY")"; fi
}
http() { # method, path, [json], [token] -> prints status, body in $BODY
  local args=(-s -o "$BODY" -w '%{http_code}' -X "$1" "$BASE_URL$2" -H 'Content-Type: application/json')
  [ -n "${3:-}" ] && args+=(--data "$3")
  [ -n "${4:-}" ] && args+=(-H "Authorization: Bearer $4")
  curl "${args[@]}"
}
json() { "$PY" -c "import json,sys; d=json.load(open(sys.argv[1], encoding='utf-8')); print(eval(sys.argv[2]))" "$BODY" "$1"; }

echo "MealSync smoke test against $BASE_URL"

echo "[frontend]"
check "nginx /health" 200 "$(http GET /health)"
check "SPA index served" 200 "$(http GET /)"
check "index contains app root" True "$(grep -q 'id="root"' "$BODY" && echo True || echo False)"

echo "[public API + database]"
check "GET /api/meals" 200 "$(http GET /api/meals)"
MEALS=$(json 'len(d)')
check "meal catalogue loaded from MySQL" True "$([ "${MEALS:-0}" -gt 0 ] && echo True || echo False)"
MEAL_ID=$(json 'next(m["id"] for m in d if m.get("isAvailable") and (m.get("availableQuantity") or 0) > 0)')

echo "[authentication]"
SUFFIX="$(date +%s)$RANDOM"
EMAIL="smoke-$SUFFIX@example.com"
PASSWORD="Smoke-$("$PY" -c 'import secrets; print(secrets.token_hex(12))')"
check "register new student" 201 "$(http POST /api/auth/register "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
check "duplicate registration rejected" 409 "$(http POST /api/auth/register "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
check "wrong password rejected" 401 "$(http POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"wrong-$PASSWORD\"}")"
check "login" 200 "$(http POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
TOKEN=$(json 'd["token"]')
USER_ID=$(json 'd["userId"]')
check "login role" ROLE_USER "$(json 'd["role"]')"
check "GET /api/auth/me with token" 200 "$(http GET /api/auth/me "" "$TOKEN")"
check "GET /api/auth/me without token" 401 "$(http GET /api/auth/me)"
check "student denied admin overview" 403 "$(http GET /api/admin/overview "" "$TOKEN")"
check "tampered token rejected" 401 "$(http GET /api/auth/me "" "${TOKEN}x")"

echo "[orders]"
check "pickup slots listed" 200 "$(http GET /api/slots "" "$TOKEN")"
# JSON-encoded (ASCII-escaped) label of an open slot with room left today
SLOT=$(json 'json.dumps(next(s["label"] for s in d if s["active"] and s["remaining"] > 0))')
ORDER_JSON="{\"pickupSlot\":$SLOT,\"paymentMethod\":\"UPI\",\"idempotencyKey\":\"smoke-$SUFFIX\",\"items\":[{\"menuItemId\":$MEAL_ID,\"qty\":1}]}"
check "place order" 201 "$(http POST /api/orders "$ORDER_JSON" "$TOKEN")"
ORDER_ID=$(json 'd["id"]')
check "order id returned" True "$([ -n "$ORDER_ID" ] && echo True || echo False)"
check "idempotent retry returns existing order" 200 "$(http POST /api/orders "$ORDER_JSON" "$TOKEN")"
check "same order id on retry" "id=$ORDER_ID" "id=$(json 'd["id"]')"
check "order history" 200 "$(http GET "/api/orders/user/$USER_ID" "" "$TOKEN")"
check "order present in history" True "$(json "any(o['id'] == $ORDER_ID for o in d)")"
check "cancel order" 200 "$(http PUT "/api/orders/$ORDER_ID/cancel" "" "$TOKEN")"

echo "[roles]"
SP_EMAIL="smoke-sp-$SUFFIX@example.com"
check "register with an admin role in the payload" 201 "$(http POST /api/auth/register "{\"name\":\"Smoke Promo\",\"email\":\"$SP_EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"ROLE_ADMIN\"}")"
http POST /api/auth/login "{\"email\":\"$SP_EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
check "payload role ignored: account is a student" ROLE_USER "$(json 'd["role"]')"
TOKEN_SP=$(json 'd["token"]')
check "student cannot list users (admin API)" 403 "$(http GET /api/admin/users "" "$TOKEN")"
check "student cannot change roles (admin API)" 403 "$(http PUT "/api/admin/users/$USER_ID/role" '{"role":"ADMIN"}' "$TOKEN")"

echo "[subscriptions]"
check "list plans" 200 "$(http GET /api/subscriptions/plans "" "$TOKEN")"
check "plan catalogue loaded" True "$(json 'len(d) >= 5')"
check "subscribe (simulated payment)" 201 "$(http POST /api/subscriptions '{"planCode":"MONTHLY_LUNCH","paymentMethod":"UPI"}' "$TOKEN")"
SUB_ID=$(json 'd["id"]')
check "subscription active and marked simulated" "ACTIVE True" "$(json 'd["status"] + " " + str(d["paymentSimulated"])')"
check "duplicate subscription rejected" 409 "$(http POST /api/subscriptions '{"planCode":"MONTHLY_LUNCH"}' "$TOKEN")"
check "pause" 200 "$(http POST "/api/subscriptions/$SUB_ID/pause" "" "$TOKEN")"
check "pause again is an invalid transition" 409 "$(http POST "/api/subscriptions/$SUB_ID/pause" "" "$TOKEN")"
http POST /api/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
TOKEN2=$(json 'd["token"]')
check "state persists across a new login" 200 "$(http GET /api/subscriptions/me "" "$TOKEN2")"
check "subscription still paused" PAUSED "$(json 'd[0]["status"]')"
check "resume" 200 "$(http POST "/api/subscriptions/$SUB_ID/resume" "" "$TOKEN2")"
check "other users cannot modify it" 404 "$(http POST "/api/subscriptions/$SUB_ID/pause" "" "$TOKEN_SP")"

echo "[exposure]"
ACT=$(http GET /actuator/health)
check "actuator not exposed via frontend" True "$([ "$ACT" != 200 ] || ! grep -q '"status"' "$BODY" && echo True || echo False)"

echo "------------------------------------------------------------"
echo "Passed: $PASS  Failed: $FAIL"
[ "$FAIL" -eq 0 ]
