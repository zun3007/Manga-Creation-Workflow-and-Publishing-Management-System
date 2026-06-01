// E2E test library: request helpers, login, and test suite collector
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let accounts;
const HERE = dirname(fileURLToPath(import.meta.url));

export function loadAccounts(accountsPath = join(HERE, '..', 'accounts.json')) {
  const data = JSON.parse(readFileSync(accountsPath, 'utf8'));
  accounts = data;
  return data;
}

/**
 * Helper: make an HTTP request
 * @param {string} method - HTTP method
 * @param {string} path - API path (e.g., '/proposals')
 * @param {Object} options - { token?, body?, raw? }
 * @returns {Promise<{status: number, ok: boolean, json: any, text: string}>}
 */
export async function req(method, path, options = {}) {
  const { token, body, raw } = options;
  const apiBase = accounts?.apiBase || 'http://localhost:3000/api';
  const url = `${apiBase}${path}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method,
    headers,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      status: response.status,
      ok: response.ok,
      json,
      text,
    };
  } catch (err) {
    throw new Error(`Request failed for ${method} ${path}: ${err.message}`);
  }
}

/**
 * Helper: login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} JWT access token
 */
export async function login(email, password) {
  const result = await req('POST', '/auth/login', {
    body: { email, password },
  });
  if (result.status !== 201 && result.status !== 200) {
    throw new Error(`Login failed: ${result.status} ${result.text}`);
  }
  return result.json.accessToken;
}

/**
 * Test suite collector: collects pass/fail checks and generates a report
 */
export class Suite {
  constructor(name) {
    this.name = name;
    this.checks = [];
  }

  check(name, condition, detail = '') {
    const passed = !!condition;
    this.checks.push({
      name,
      passed,
      detail: passed ? '' : detail,
    });
    return passed;
  }

  results() {
    const passed = this.checks.filter((c) => c.passed).length;
    const total = this.checks.length;
    return { name: this.name, passed, total, checks: this.checks };
  }

  print() {
    const r = this.results();
    console.log(`\n[${this.name}] ${r.passed}/${r.total} checks passed`);
    for (const check of r.checks) {
      const icon = check.passed ? '✓' : '✗';
      const detail = check.detail ? ` — ${check.detail}` : '';
      console.log(`  ${icon} ${check.name}${detail}`);
    }
  }
}

/**
 * Aggregator: collects results from multiple suites
 */
export class TestRunner {
  constructor() {
    this.suites = [];
  }

  addSuite(suite) {
    this.suites.push(suite);
  }

  summary() {
    const totals = { passed: 0, total: 0 };
    const suiteResults = [];
    for (const suite of this.suites) {
      const r = suite.results();
      suiteResults.push(r);
      totals.passed += r.passed;
      totals.total += r.total;
    }
    return {
      passed: totals.passed,
      total: totals.total,
      failed: totals.total - totals.passed,
      suites: suiteResults,
    };
  }

  print() {
    for (const suite of this.suites) {
      suite.print();
    }
    const summary = this.summary();
    console.log(
      `\n[OVERALL] ${summary.passed}/${summary.total} checks passed, ${summary.failed} failed`
    );
  }
}

export { readFileSync };
