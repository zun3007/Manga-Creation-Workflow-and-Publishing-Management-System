# STATUS — Comprehensive Testing & Benchmark Suite

**Goal (user):** test by *every* method, in `test/`, best free tools, 1–3 accounts per role, Postman (+ Swagger if useful), free benchmarks by every possible method, fully transparent, every case covered.

**Stack (verified up 2026-06-01):** MySQL `manga-dev-mysql` healthy :3308 (root/`manga_root`, db `manga_creation_workflow_and_publishing_management_system`) · API live :3000 `/api` (login → `{accessToken, user{id,email,name,role,avatarUrl}}`) · web :5173. pnpm 11.0.9, node 24, LibreOffice + PyMuPDF installed earlier.

## Methods (what "every method" means here)
1. **Account seeding** — 2 accounts/role (10) + profiles, idempotent, login-verified. → `test/seed/`, `test/accounts.json`
2. **Unit tests (existing)** — api jest (46), web vitest (124) + coverage. (baseline)
3. **Functional E2E (code)** — full pipeline proposal→…→dispute across roles, scripted Node runner w/ assertions + JSON report. → `test/e2e/`
4. **Postman collection + Newman** — all endpoints by module, per-role auth, happy-path + tests; HTML report. → `test/postman/`, `reports/newman-report.html`
5. **Swagger / OpenAPI** — add `@nestjs/swagger` to api → `/api/docs` + `openapi.json`; drives contract checks. → api edit + `test/openapi.json`
6. **RBAC / authorization matrix** — every role × endpoint-group: allowed=2xx, forbidden=403, unauth=401. → part of e2e + postman
7. **Validation / negative** — bad body→400, missing auth→401, wrong role→403, not found→404, illegal state transition→400.
8. **Benchmark (free, multiple):** autocannon (throughput/latency), custom p50/p95/p99, k6 (if installable via winget), DB query timing. → `test/benchmark/`, `benchmark/REPORT.md`
9. **(optional) Lighthouse** web perf if Chrome reachable.
10. **Master report** — `test/RESULTS.md` + `test/README.md` (how-to + coverage + numbers).

## Test accounts (deterministic; password `Test1234!`)
mangaka1/2, assistant1/2, tantou_editor1/2, editorial_board1/2, admin1/2 @test.inkframe.studio (2 admins → safe for last-admin-guard tests). Source of truth: `test/accounts.json`.

## Progress
- [x] scaffold test/ + seed script
- [x] install deps + seed 10 accounts (login 10/10 OK) + 5 Task_Price_Rule rows
- [x] Swagger on api (main.ts + nest-cli plugin) → /api/docs + test/openapi.json (61 paths). NOTE: required fixing pnpm-workspace.yaml `@scarf/scarf: false` (was placeholder → broke pnpm); restarted api (bg id b0sdrqiee).
- [x] E2E runner — **68/68 PASS** (Auth 23, Happy-path 28, RBAC 11, Validation 5+1). Fixed many capture/shape bugs (seriesId, task_id, submission_id, chapter IN_PROGRESS step, board2, review .decision, close 201, rankings .id, decisions/dispute {ok}).
- [x] benchmarks — autocannon (Health 7734 r/s @0.75ms; authed ~1k-1.2k r/s @8-9ms, p99 14-18ms, 0 err) + percentiles (p99 19-63ms, 0 err over 600/endpoint). k6: winget id `Grafana.k6` NOT FOUND → k6 unavailable; script authored for users who have it.
- [x] unit tests — api jest 46/46 (cov ~21% stmts, targeted specs) + web vitest 124/124.
- [~] Postman/Newman — 79 requests run; 1st pass 44 fail → 2nd 26 fail (all assertion-shape/201-vs-200, not API bugs) → dispatched final fix subagent (af7c3fd3401786338). Re-run pending.
- [x] README.md
- [ ] RESULTS.md + commit (after final Newman)

## Live evidence captured
- E2E: 68/68, reports/e2e-results.json. RBAC + validation fully green.
- autocannon-results.json + percentiles-results.json in reports/.
- Swagger live: http://localhost:3000/api/docs (api bg b0sdrqiee still running).
- api changed (swagger): apps/backend/src/main.ts, apps/backend/nest-cli.json, apps/backend/package.json (+@nestjs/swagger), pnpm-workspace.yaml (scarf:false). These are real source changes on dev/sprint3-studio — include in commit or note.

## Notes / guardrails
- powershell.exe + PowerPoint-COM BLOCKED by classifier (don't retry). winget OK.
- DB creds are committed dev config (docker-compose), not .env secrets.
- API already running (PID from prior session). Adding Swagger needs a restart — will manage carefully (watch-reload or controlled restart) before Swagger-dependent steps.
