import autocannon from 'autocannon';
import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  apiBase: 'http://localhost:3000/api',
  connections: 10,
  duration: 10,
  // Endpoints to benchmark: { method, path, requiresAuth }
  endpoints: [
    { method: 'GET', path: '', requiresAuth: false, label: 'Health (GET /api)' },
    { method: 'GET', path: '/genres', requiresAuth: true, label: 'Genres' },
    { method: 'GET', path: '/dashboard/summary', requiresAuth: true, label: 'Dashboard Summary' },
    { method: 'GET', path: '/series/all', requiresAuth: true, label: 'Series (Board/Admin)' },
    { method: 'GET', path: '/notifications', requiresAuth: true, label: 'Notifications' },
  ],
};

async function loadAccounts() {
  const accountsPath = path.join(process.cwd(), 'test', 'accounts.json');
  const data = await fs.readFile(accountsPath, 'utf-8');
  const parsed = JSON.parse(data);
  return parsed;
}

async function loginAdmin(accounts) {
  const admin = accounts.accounts.find(a => a.role === 'ADMIN');
  if (!admin) throw new Error('No ADMIN account in test data');

  const response = await fetch(`${CONFIG.apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: admin.email,
      password: accounts.password,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Login failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.accessToken;
}

async function runBenchmark(endpoint, token) {
  const url = `${CONFIG.apiBase}${endpoint.path}`;
  const headers = endpoint.requiresAuth
    ? { 'Authorization': `Bearer ${token}` }
    : {};

  console.log(`\nBenchmarking: ${endpoint.label}`);
  console.log(`  ${endpoint.method} ${endpoint.path}`);

  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        method: endpoint.method,
        connections: CONFIG.connections,
        duration: CONFIG.duration,
        headers,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

async function main() {
  try {
    // Load accounts and login
    console.log('Loading test accounts...');
    const accounts = await loadAccounts();
    console.log('Logging in as admin1...');
    const token = await loginAdmin(accounts);
    console.log('✓ Authenticated\n');

    const results = [];

    // Run each endpoint
    for (const endpoint of CONFIG.endpoints) {
      const result = await runBenchmark(endpoint, token);
      results.push({
        label: endpoint.label,
        method: endpoint.method,
        path: endpoint.path,
        requests: {
          total: result.requests.total,
          persec: result.requests.mean.toFixed(2),
        },
        latency: {
          mean: result.latency.mean.toFixed(2),
          p97_5: result.latency.p97_5?.toFixed(2) || 'N/A',
          p99: result.latency.p99?.toFixed(2) || 'N/A',
        },
        throughput: {
          persec: result.throughput.mean.toFixed(2),
        },
        errors: {
          '2xx': result['2xx'] || 0,
          '4xx': result['4xx'] || 0,
          '5xx': result['5xx'] || 0,
        },
      });
    }

    // Print summary table
    console.log('\n=== AUTOCANNON BENCHMARK SUMMARY ===\n');
    console.table(results.map(r => ({
      'Endpoint': r.label,
      'Req/s': r.requests.persec,
      'Latency (ms)': r.latency.mean,
      'p97.5 (ms)': r.latency.p97_5,
      'p99 (ms)': r.latency.p99,
      'Throughput (B/s)': r.throughput.persec,
      '2xx': r.errors['2xx'],
      '4xx': r.errors['4xx'],
      '5xx': r.errors['5xx'],
    })));

    // Write JSON report
    const reportDir = path.join(process.cwd(), 'test', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'autocannon-results.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n✓ Report written to ${reportPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
