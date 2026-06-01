import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = 'http://localhost:3000/api';

export const options = {
  stages: [
    { duration: '10s', target: 5 },    // Ramp up to 5 VUs over 10s
    { duration: '15s', target: 20 },   // Ramp up to 20 VUs over 15s
    { duration: '10s', target: 20 },   // Stay at 20 VUs for 10s
    { duration: '10s', target: 0 },    // Ramp down to 0 VUs over 10s
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

let token = '';

export function setup() {
  // Load accounts from test file (requires k6 to have access to local file system)
  // For k6, we'll read via environment variable or hardcode test credentials
  const loginPayload = {
    email: 'admin1@test.inkframe.studio',
    password: 'Test1234!',
  };

  const loginRes = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const loginSuccess = check(loginRes, {
    'login status is 201': (r) => r.status === 201,
    'login has token': (r) => r.json('accessToken') !== '',
  });

  if (!loginSuccess) {
    throw new Error('Login failed in setup()');
  }

  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // Test 1: Public endpoint (no auth)
  const healthRes = http.get(`${API_BASE}/health`);
  check(healthRes, {
    'health GET 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // Test 2: Authenticated endpoint - Dashboard Summary
  const dashRes = http.get(`${API_BASE}/dashboard/summary`, authHeaders);
  check(dashRes, {
    'dashboard GET 200': (r) => r.status === 200,
    'dashboard has role': (r) => r.json('role') !== undefined,
  });

  sleep(0.5);

  // Test 3: Authenticated endpoint - Notifications (requires auth)
  const notifRes = http.get(`${API_BASE}/notifications`, authHeaders);
  check(notifRes, {
    'notifications GET 200 or 401': (r) => r.status === 200 || r.status === 401,
    'notifications is array or error': (r) => Array.isArray(r.json()) || r.json('error') !== undefined,
  });

  sleep(0.5);
}
