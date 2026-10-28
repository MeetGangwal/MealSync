import http from 'k6/http';
import { check, sleep } from 'k6';

// ─────────────────────────────────────────────────────────────────────────────
// MealSync — k6 Load Testing Script
// Target: Safe read-only health and UI endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Configurable via CLI flags or environment variables:
// e.g. k6 run -e BASE_URL=http://localhost:3080 -e VUS=20 infra/load-testing/k6-test.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3080';
const TARGET_VUS = parseInt(__ENV.VUS || '10', 10);
const STEADY_DURATION = __ENV.DURATION || '15s';

export const options = {
  stages: [
    { duration: '5s', target: TARGET_VUS },        // Ramp-up
    { duration: STEADY_DURATION, target: TARGET_VUS }, // Steady sustained load
    { duration: '5s', target: 0 },                 // Ramp-down
  ],
  thresholds: {
    // 95% of requests must complete below 200ms
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    // Error rate must remain under 1%
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Test 1: Frontend healthcheck endpoint (/health)
  const healthRes = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: 'health' },
  });

  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response body is ok': (r) => r.body.includes('ok'),
  });

  // Test 2: Frontend index page (/)
  const rootRes = http.get(`${BASE_URL}/`, {
    tags: { endpoint: 'root_index' },
  });

  check(rootRes, {
    'root status is 200': (r) => r.status === 200,
  });

  // Pacing: simulate realistic user pause between requests (100ms - 300ms)
  sleep(0.2);
}
