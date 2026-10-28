#!/bin/bash
BASE_URL="http://localhost:8080"

echo "=== 1. Student Valid Login ==="
RES1=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"aryan@spit.edu","password":"password123"}')
echo "$RES1"

echo "=== 2. Admin Valid Login ==="
RES2=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spit.mess","password":"admin123"}')
echo "$RES2"

echo "=== 3. Invalid Password ==="
RES3=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"aryan@spit.edu","password":"wrongpassword"}')
echo "$RES3"

echo "=== 4. Unknown Email ==="
RES4=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@unknown.com","password":"password123"}')
echo "$RES4"

echo "=== 5. Missing / Empty Fields ==="
RES5=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":""}')
echo "$RES5"

STUDENT_TOKEN=$(echo "$RES1" | grep -v "HTTP_CODE" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf-8')).token || '')")
ADMIN_TOKEN=$(echo "$RES2" | grep -v "HTTP_CODE" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf-8')).token || '')")

echo "=== 6. Authenticated Student to Protected Student Endpoint (/api/orders/user/1) ==="
RES6=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/api/orders/user/1" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
echo "$RES6"

echo "=== 7. Student Request to Admin Endpoint (/api/admin/payment-records) ==="
RES7=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/api/admin/payment-records" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
echo "$RES7"

echo "=== 8. Unauthenticated Request to Admin Endpoint ==="
RES8=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/api/admin/payment-records")
echo "$RES8"

echo "=== 9. Admin Request to Admin Endpoint ==="
RES9=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" -X GET "$BASE_URL/api/admin/payment-records" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$RES9" | head -n 5
echo "$RES9" | tail -n 2

