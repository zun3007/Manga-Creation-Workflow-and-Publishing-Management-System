import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  apiBase: 'http://localhost:3000/api',
  requestsPerEndpoint: 600,
  concurrency: 20,
  // Endpoints to benchmark
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
  return JSON.parse(data);
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

function computePercentile(sortedLatencies, p) {
  const index = Math.ceil((p / 100) * sortedLatencies.length) - 1;
  return sortedLatencies[Math.max(0, index)];
}

async function fetchWithLatency(url, headers) {
  const start = performance.now();
  try {
    const response = await fetch(url, { headers });
    const latency = performance.now() - start;
    return { latency, status: response.status, ok: response.ok };
  } catch (err) {
    const latency = performance.now() - start;
    return { latency, status: 0, ok: false, error: err.message };
  }
}

async function runEndpointBenchmark(endpoint, token) {
  const url = `${CONFIG.apiBase}${endpoint.path}`;
  const headers = endpoint.requiresAuth
    ? { 'Authorization': `Bearer ${token}` }
    : {};

  console.log(`\nBenchmarking: ${endpoint.label}`);
  console.log(`  ${CONFIG.requestsPerEndpoint} requests at concurrency ${CONFIG.concurrency}`);

  const latencies = [];
  let errors = 0;
  let successCount = 0;

  // Fire requests in concurrent batches
  const batchSize = CONFIG.concurrency;
  const totalBatches = Math.ceil(CONFIG.requestsPerEndpoint / batchSize);

  for (let batch = 0; batch < totalBatches; batch++) {
    const remaining = CONFIG.requestsPerEndpoint - (batch * batchSize);
    const currentBatch = Math.min(batchSize, remaining);
    const promises = [];

    for (let i = 0; i < currentBatch; i++) {
      promises.push(fetchWithLatency(url, headers));
    }

    const results = await Promise.all(promises);
    results.forEach(result => {
      latencies.push(result.latency);
      if (result.ok && result.status === 200) {
        successCount++;
      } else {
        errors++;
      }
    });

    // Progress indicator
    process.stdout.write(`\r  Progress: ${Math.min(batch * batchSize + currentBatch, CONFIG.requestsPerEndpoint)}/${CONFIG.requestsPerEndpoint}`);
  }

  console.log(''); // newline after progress

  // Compute statistics
  const sorted = latencies.sort((a, b) => a - b);
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    label: endpoint.label,
    method: endpoint.method,
    path: endpoint.path,
    requests: CONFIG.requestsPerEndpoint,
    success: successCount,
    errors,
    latency: {
      min: min.toFixed(2),
      p50: computePercentile(sorted, 50).toFixed(2),
      p90: computePercentile(sorted, 90).toFixed(2),
      p95: computePercentile(sorted, 95).toFixed(2),
      p99: computePercentile(sorted, 99).toFixed(2),
      mean: mean.toFixed(2),
      max: max.toFixed(2),
    },
    throughput: {
      persec: (CONFIG.requestsPerEndpoint / (max / 1000)).toFixed(2),
    },
  };
}

async function main() {
  try {
    console.log('Loading test accounts...');
    const accounts = await loadAccounts();
    console.log('Logging in as admin1...');
    const token = await loginAdmin(accounts);
    console.log('✓ Authenticated\n');

    const results = [];

    for (const endpoint of CONFIG.endpoints) {
      const result = await runEndpointBenchmark(endpoint, token);
      results.push(result);
    }

    // Print summary table
    console.log('\n=== PERCENTILES BENCHMARK SUMMARY ===\n');
    console.table(results.map(r => ({
      'Endpoint': r.label,
      'Requests': r.requests,
      'Success': r.success,
      'Errors': r.errors,
      'Min (ms)': r.latency.min,
      'p50 (ms)': r.latency.p50,
      'p95 (ms)': r.latency.p95,
      'p99 (ms)': r.latency.p99,
      'Mean (ms)': r.latency.mean,
      'Max (ms)': r.latency.max,
      'Req/s': r.throughput.persec,
    })));

    // Write JSON report
    const reportDir = path.join(process.cwd(), 'test', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'percentiles-results.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n✓ Report written to ${reportPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
