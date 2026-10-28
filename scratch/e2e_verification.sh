#!/bin/bash
set -e

BASE_URL="http://localhost:8080"

echo "=========================================="
echo "MEALSYNC COMPLETE END-TO-END VERIFICATION"
echo "=========================================="

echo -e "\n1. Testing Student Login (aryan@spit.edu)..."
STUDENT_LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"aryan@spit.edu","password":"password123"}')

STUDENT_TOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).token || '')" "$STUDENT_LOGIN_RES")
STUDENT_ID=$(node -e "console.log(JSON.parse(process.argv[1]).userId || '')" "$STUDENT_LOGIN_RES")
STUDENT_ROLE=$(node -e "console.log(JSON.parse(process.argv[1]).role || '')" "$STUDENT_LOGIN_RES")

echo "Student ID: $STUDENT_ID, Role: $STUDENT_ROLE"
if [ -z "$STUDENT_TOKEN" ]; then
  echo "FAILED: Student login failed. Response: $STUDENT_LOGIN_RES"
  exit 1
fi
echo "SUCCESS: Student JWT acquired."

echo -e "\n2. Testing Student Order History (GET /api/orders/user/$STUDENT_ID)..."
STUDENT_ORDERS_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X GET "$BASE_URL/api/orders/user/$STUDENT_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
STUDENT_ORDERS_STATUS=$(echo "$STUDENT_ORDERS_RES" | grep "HTTP_STATUS" | cut -d':' -f2)

echo "HTTP Status: $STUDENT_ORDERS_STATUS"
if [ "$STUDENT_ORDERS_STATUS" -gt 299 ]; then
  echo "FAILED: Expected 200, got $STUDENT_ORDERS_STATUS. Response: $STUDENT_ORDERS_RES"
  exit 1
fi
echo "SUCCESS: Student order history loaded without 401 error!"

echo -e "\n3. Checking Initial Stock of Meal 52 (Special Thali)..."
MEAL_BEFORE=$(curl -s "$BASE_URL/api/meals/52")
STOCK_BEFORE=$(node -e "console.log(JSON.parse(process.argv[1]).availableQuantity)" "$MEAL_BEFORE")
echo "Meal 52 initial stock: $STOCK_BEFORE"

echo -e "\n4. Placing Student Order with Dummy UPI Payment..."
IK="e2e_test_ik_$(date +%s)"
ORDER_REQ=$(cat <<JSON
{
  "pickupSlot": "12:30 PM - 1:00 PM",
  "paymentMethod": "UPI",
  "items": [{"menuItemId": 52, "qty": 1}],
  "idempotencyKey": "$IK",
  "simulateFailure": false
}
JSON
)

ORDER_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_REQ")

ORDER_STATUS=$(echo "$ORDER_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
ORDER_BODY=$(echo "$ORDER_RES" | grep -v "HTTP_STATUS")
echo "HTTP Status: $ORDER_STATUS"

if [ "$ORDER_STATUS" -gt 299 ]; then
  echo "FAILED: Student order failed with status $ORDER_STATUS. Body: $ORDER_BODY"
  exit 1
fi

ORDER_NUM=$(node -e "console.log(JSON.parse(process.argv[1]).orderNumber)" "$ORDER_BODY")
TXN_ID=$(node -e "console.log(JSON.parse(process.argv[1]).transactionId)" "$ORDER_BODY")
PAY_STATUS=$(node -e "console.log(JSON.parse(process.argv[1]).paymentStatus)" "$ORDER_BODY")
echo "SUCCESS: Order created! OrderNum: $ORDER_NUM, TxnId: $TXN_ID, PaymentStatus: $PAY_STATUS"

echo -e "\n5. Verifying Stock Decrement in MySQL..."
MEAL_AFTER=$(curl -s "$BASE_URL/api/meals/52")
STOCK_AFTER=$(node -e "console.log(JSON.parse(process.argv[1]).availableQuantity)" "$MEAL_AFTER")
echo "Meal 52 stock after order: $STOCK_AFTER"
EXPECTED_STOCK=$((STOCK_BEFORE - 1))
if [ "$STOCK_AFTER" -ne "$EXPECTED_STOCK" ]; then
  echo "FAILED: Stock mismatch! Expected $EXPECTED_STOCK, got $STOCK_AFTER"
  exit 1
fi
echo "SUCCESS: Stock decremented by exactly 1 in MySQL!"

echo -e "\n6. Testing Idempotency (Re-submitting with identical key)..."
RETRY_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_REQ")
RETRY_BODY=$(echo "$RETRY_RES" | grep -v "HTTP_STATUS")
RETRY_ORDER_NUM=$(node -e "console.log(JSON.parse(process.argv[1]).orderNumber)" "$RETRY_BODY")

MEAL_AFTER_RETRY=$(curl -s "$BASE_URL/api/meals/52")
STOCK_AFTER_RETRY=$(node -e "console.log(JSON.parse(process.argv[1]).availableQuantity)" "$MEAL_AFTER_RETRY")
echo "Meal 52 stock after retry: $STOCK_AFTER_RETRY"

if [ "$RETRY_ORDER_NUM" != "$ORDER_NUM" ] || [ "$STOCK_AFTER_RETRY" -ne "$STOCK_AFTER" ]; then
  echo "FAILED: Idempotency check failed! Order: $RETRY_ORDER_NUM vs $ORDER_NUM, Stock: $STOCK_AFTER_RETRY vs $STOCK_AFTER"
  exit 1
fi
echo "SUCCESS: Duplicate submission returned existing order without decrementing stock again!"

echo -e "\n7. Testing Controlled Payment Failure (simulateFailure: true)..."
FAIL_IK="fail_ik_$(date +%s)"
FAIL_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"pickupSlot\":\"12:30 PM - 1:00 PM\",\"paymentMethod\":\"CARD\",\"items\":[{\"menuItemId\":52,\"qty\":1}],\"idempotencyKey\":\"$FAIL_IK\",\"simulateFailure\":true}")

FAIL_STATUS=$(echo "$FAIL_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
echo "HTTP Status for simulated failure: $FAIL_STATUS"

MEAL_AFTER_FAIL=$(curl -s "$BASE_URL/api/meals/52")
STOCK_AFTER_FAIL=$(node -e "console.log(JSON.parse(process.argv[1]).availableQuantity)" "$MEAL_AFTER_FAIL")
echo "Meal 52 stock after failed payment: $STOCK_AFTER_FAIL"

if [ "$FAIL_STATUS" -ne 402 ] || [ "$STOCK_AFTER_FAIL" -ne "$STOCK_AFTER" ]; then
  echo "FAILED: Payment failure test failed! Status: $FAIL_STATUS, Stock: $STOCK_AFTER_FAIL"
  exit 1
fi
echo "SUCCESS: Payment failure returned HTTP 402 and preserved inventory without decrementing!"

echo -e "\n8. Testing Profile Update (PUT /api/auth/profile)..."
PROFILE_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Aryan Sharma","phone":"+91 9876543210","uid":"UID-SPIT-2024-001"}')

PROFILE_STATUS=$(echo "$PROFILE_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
echo "HTTP Status: $PROFILE_STATUS"
if [ "$PROFILE_STATUS" -gt 299 ]; then
  echo "FAILED: Profile update failed with status $PROFILE_STATUS. Response: $PROFILE_RES"
  exit 1
fi
echo "SUCCESS: Profile updated in database!"

echo -e "\n9. Testing Admin Login (admin@spit.mess)..."
ADMIN_LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spit.mess","password":"admin123"}')

ADMIN_TOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).token || '')" "$ADMIN_LOGIN_RES")
ADMIN_ROLE=$(node -e "console.log(JSON.parse(process.argv[1]).role || '')" "$ADMIN_LOGIN_RES")
echo "Admin Role: $ADMIN_ROLE"
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_ROLE" != "ROLE_ADMIN" ]; then
  echo "FAILED: Admin login failed. Response: $ADMIN_LOGIN_RES"
  exit 1
fi
echo "SUCCESS: Admin JWT acquired with ROLE_ADMIN!"

echo -e "\n10. Testing Admin Rejection from Student Checkout..."
ADMIN_CHECKOUT_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupSlot":"12:30 PM - 1:00 PM","paymentMethod":"UPI","items":[{"menuItemId":52,"qty":1}]}')
ADMIN_CHECKOUT_STATUS=$(echo "$ADMIN_CHECKOUT_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
echo "Admin student checkout HTTP Status: $ADMIN_CHECKOUT_STATUS"
if [ "$ADMIN_CHECKOUT_STATUS" -ne 403 ]; then
  echo "FAILED: Admin should be rejected from student checkout with 403 Forbidden! Got $ADMIN_CHECKOUT_STATUS"
  exit 1
fi
echo "SUCCESS: Admin correctly rejected from student checkout with HTTP 403 Forbidden!"

echo -e "\n11. Testing Admin Customer Search (GET /api/admin/customers/search?query=Aryan)..."
SEARCH_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X GET "$BASE_URL/api/admin/customers/search?query=Aryan" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
SEARCH_STATUS=$(echo "$SEARCH_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
SEARCH_BODY=$(echo "$SEARCH_RES" | grep -v "HTTP_STATUS")
echo "Search status: $SEARCH_STATUS, Results: $SEARCH_BODY"
if [ "$SEARCH_STATUS" -gt 299 ]; then
  echo "FAILED: Customer search failed with status $SEARCH_STATUS"
  exit 1
fi
echo "SUCCESS: Admin customer lookup works!"

echo -e "\n12. Testing Admin Walk-in Counter Sale (POST /api/admin/counter-orders)..."
STOCK_BEFORE_COUNTER=$(curl -s "$BASE_URL/api/meals/52" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf-8')).availableQuantity)")
echo "Stock before counter sale: $STOCK_BEFORE_COUNTER"

COUNTER_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$BASE_URL/api/admin/counter-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Walk-in Visitor",
    "customerPhone": "+91 9999888877",
    "paymentMethod": "CASH",
    "cashCollected": true,
    "pickupSlot": "Instant Counter Pickup",
    "items": [{"menuItemId": 52, "qty": 2}]
  }')

COUNTER_STATUS=$(echo "$COUNTER_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
COUNTER_BODY=$(echo "$COUNTER_RES" | grep -v "HTTP_STATUS")
echo "Counter sale HTTP status: $COUNTER_STATUS"
if [ "$COUNTER_STATUS" -gt 299 ]; then
  echo "FAILED: Counter sale failed! Response: $COUNTER_BODY"
  exit 1
fi

COUNTER_ORDER_NUM=$(node -e "console.log(JSON.parse(process.argv[1]).orderNumber)" "$COUNTER_BODY")
COUNTER_SOURCE=$(node -e "console.log(JSON.parse(process.argv[1]).orderSource)" "$COUNTER_BODY")
COUNTER_OPERATOR=$(node -e "console.log(JSON.parse(process.argv[1]).counterOperator)" "$COUNTER_BODY")
echo "Counter sale created: $COUNTER_ORDER_NUM, Source: $COUNTER_SOURCE, Operator: $COUNTER_OPERATOR"

STOCK_AFTER_COUNTER=$(curl -s "$BASE_URL/api/meals/52" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf-8')).availableQuantity)")
echo "Stock after counter sale: $STOCK_AFTER_COUNTER"
EXPECTED_STOCK_COUNTER=$((STOCK_BEFORE_COUNTER - 2))
if [ "$STOCK_AFTER_COUNTER" -ne "$EXPECTED_STOCK_COUNTER" ]; then
  echo "FAILED: Counter stock decrement mismatch! Expected $EXPECTED_STOCK_COUNTER, got $STOCK_AFTER_COUNTER"
  exit 1
fi
echo "SUCCESS: Counter sale atomically decremented shared MySQL stock by 2!"

echo -e "\n13. Testing Payment Records Query (GET /api/admin/payment-records)..."
RECORDS_RES=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X GET "$BASE_URL/api/admin/payment-records" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
RECORDS_STATUS=$(echo "$RECORDS_RES" | grep "HTTP_STATUS" | cut -d':' -f2)
echo "Payment records HTTP status: $RECORDS_STATUS"
if [ "$RECORDS_STATUS" -gt 299 ]; then
  echo "FAILED: Payment records endpoint failed!"
  exit 1
fi

echo -e "\n14. Testing Payment Records Search by Counter Order Number ($COUNTER_ORDER_NUM)..."
SEARCH_ORDER_RES=$(curl -s -X GET "$BASE_URL/api/admin/payment-records?search=$COUNTER_ORDER_NUM" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$SEARCH_ORDER_RES" | grep -q "$COUNTER_ORDER_NUM"; then
  echo "SUCCESS: Found counter order in payment records by order number search!"
else
  echo "FAILED: Could not find $COUNTER_ORDER_NUM in search results!"
  exit 1
fi

echo -e "\n=========================================="
echo "ALL END-TO-END VERIFICATION CHECKS PASSED!"
echo "=========================================="
