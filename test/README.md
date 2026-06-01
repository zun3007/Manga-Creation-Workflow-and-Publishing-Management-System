# Test & Benchmark Suite

Comprehensive, transparent testing for the **Manga Creation Workflow & Publishing Management System** API — every method, free tools only. See [`RESULTS.md`](./RESULTS.md) for the latest run numbers.

## Prerequisites

The live stack must be running:
```bash
pnpm db:up        # MySQL 8 (Docker, host :3308)
pnpm dev:api      # NestJS API on :3000  (Swagger UI at /api/docs)
# pnpm dev:web    # (optional) web on :5173
```
Then install test deps + seed accounts:
```bash
cd test && npm install          # autocannon, mysql2, bcryptjs, newman, htmlextra
node seed/seed-test-accounts.mjs   # 10 accounts + price rules (run from repo root or test/)
```

## Test accounts (deterministic)

Seeded by `seed/seed-test-accounts.mjs`, source of truth in [`accounts.json`](./accounts.json). **Password for all: `Test1234!`**

| Role | Accounts |
|------|----------|
| MANGAKA | `mangaka1@test.inkframe.studio`, `mangaka2@…` |
| ASSISTANT | `assistant1@…`, `assistant2@…` |
| TANTOU_EDITOR | `tantou_editor1@…`, `tantou_editor2@…` |
| EDITORIAL_BOARD | `editorial_board1@…`, `editorial_board2@…` |
| ADMIN | `admin1@…`, `admin2@…` (2 admins → safe to exercise the last-admin guard) |

The seeder also inserts a `Task_Price_Rule` per region type (base 5000) so task auto-pricing + earnings accrual are exercised, and it verifies all 10 logins against the live API.

## Methods (run from the repo root unless noted)

| # | Method | What it covers | Command |
|---|--------|----------------|---------|
| 1 | **Account seeding** | 10 role accounts + profiles + price rules, login-verified | `node test/seed/seed-test-accounts.mjs` |
| 2 | **Functional E2E** (code) | Full pipeline + Auth + RBAC matrix + Validation/negative (68 checks) | `node test/e2e/run-e2e.mjs` |
| 3 | **Postman + Newman** | All 19 modules / 79 requests, per-role auth, chained happy-path, RBAC negatives; HTML report | `cd test && npm run postman` |
| 4 | **Swagger / OpenAPI** | Interactive API docs + machine-readable spec (61 paths) | open http://localhost:3000/api/docs · spec at `test/openapi.json` |
| 5 | **Benchmark — autocannon** | Throughput (req/s) + latency (mean/p97.5/p99) under 10 connections | `node test/benchmark/bench-autocannon.mjs` |
| 6 | **Benchmark — percentiles** | Latency distribution p50/p90/p95/p99 over 600 reqs @ concurrency 20 | `node test/benchmark/bench-percentiles.mjs` |
| 7 | **Benchmark — k6** (optional) | VU ramp 0→20 with thresholds (p95<800ms, error<1%) | `k6 run test/benchmark/k6-load.js` *(install k6 first)* |
| 8 | **Unit tests** | api service specs (jest) + web component tests (vitest) | `pnpm -F api test` · `pnpm -F web test` |

One-shot (functional methods): `cd test && npm run test:all`.

## What the E2E suite checks (4 suites, 68 checks)

- **A. Auth & identity** — login all 5 roles, `GET /auth/me`, wrong-password/no-token/bad-email → 401.
- **B. Happy-path pipeline** — proposal → submit → board approve (auto-creates Series) → assign editor → chapter → page → region → priced task → assistant start → upload → submit → mangaka review APPROVED → **earnings accrue** → chapter IN_PROGRESS → READY → editor approve → publish → vote period → 2 board votes → close → ranking → decision → dispute → admin review → resolve.
- **C. RBAC matrix** — every role-restricted endpoint with the wrong role → **403**, and with no token → **401**.
- **D. Validation & negative** — bad body → 400, bad login → 401, missing resource → 404, illegal state transition → 400.

## Reports

Written to `test/reports/`:
- `e2e-results.json` — per-check E2E results
- `newman-report.html` — full Postman/Newman HTML report
- `autocannon-results.json`, `percentiles-results.json` — benchmark raw data

## Notes

- DB connection uses the committed dev defaults (`db/docker-compose.yml`: root/`manga_root`@:3308); override via `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` env vars.
- The E2E + Postman flows create real rows in the dev DB (unique titles via timestamp) — safe to re-run.
