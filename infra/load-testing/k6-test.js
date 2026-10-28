import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

// ─────────────────────────────────────────────────────────────────────────────
// MealSync — k6 Load Testing Script
// Path under test: browser -> nginx (frontend) -> /api proxy -> Spring Boot -> MySQL
//   - static frontend (/health, /)
//   - public, database-backed menu (GET /api/meals)
//   - authenticated profile (GET /api/auth/me with a JWT)
// setup() registers ONE throwaway student with a random password; no orders are
// placed, so meal stock is not consumed.
// ─────────────────────────────────────────────────────────────────────────────

// Configurable via environment variables:
//   k6 run -e BASE_URL=http://localhost:3080 -e VUS=20 -e DURATION=30s infra/load-testing/k6-test.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3080';
const TARGET_VUS = parseInt(__ENV.VUS || '10', 10);
const STEADY_DURATION = __ENV.DURATION || '15s';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  stages: [
    { duration: '5s', target: TARGET_VUS },            // Ramp-up
    { duration: STEADY_DURATION, target: TARGET_VUS }, // Steady sustained load
    { duration: '5s', target: 0 },                     // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],                            // < 1% errors overall
    checks: ['rate>0.99'],
    'http_req_duration{endpoint:static}': ['p(95)<200'],
    'http_req_duration{endpoint:meals}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:me}': ['p(95)<500', 'p(99)<1000'],
  },
};

function randomHex(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

export function setup() {
  const email = `k6-${Date.now()}-${randomHex(6)}@example.com`;
  const password = `K6-${randomHex(24)}`;
  const reg = http.post(`${BASE_URL}/api/auth/register`,
    JSON.stringify({ name: 'k6 Load Test', email, password }), { headers: JSON_HEADERS, tags: { endpoint: 'setup' } });
  if (reg.status !== 201) exec.test.abort(`registration failed: HTTP ${reg.status}`);
  const login = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }), { headers: JSON_HEADERS, tags: { endpoint: 'setup' } });
  if (login.status !== 200) exec.test.abort(`login failed: HTTP ${login.status}`);
  return { token: login.json('token') };
}

export default function (data) {
  const health = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'static' } });
  check(health, { 'health 200': (r) => r.status === 200 });

  const root = http.get(`${BASE_URL}/`, { tags: { endpoint: 'static' } });
  check(root, { 'index 200': (r) => r.status === 200 });

  const meals = http.get(`${BASE_URL}/api/meals`, { tags: { endpoint: 'meals' } });
  check(meals, {
    'meals 200': (r) => r.status === 200,
    'meals non-empty': (r) => r.status === 200 && r.json().length > 0,
  });

  const me = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { endpoint: 'me' },
  });
  check(me, { 'me 200': (r) => r.status === 200 });

  // Pacing: realistic pause between iterations
  sleep(0.2);
}
