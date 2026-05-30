# STATUS — living progress log

> **AI: read this first on every re-entry.** Update it after any meaningful change or decision.
> Keep it short and current. Older detail belongs in the per-topic docs.

- **Last updated:** 2026-05-30
- **Current phase:** **Sprint 1 COMPLETE** — `dev/` monorepo scaffolded, Sakura multi-role design system live, auth + RBAC working, Mangaka dashboard re-themed, docs rewritten.
- **Next phase:** Sprint 2 — Production pipeline (Series Proposal → Task → Submission → Mangaka Review).
- **Calendar:** Week 2 of 10 (project runs 2026-05-18 → 2026-07-26). Sprint 1 window was 2026-05-30 → 2026-06-13 (target).
- **Key fact:** The real app is `dev/` (not `demo/`). `demo/` stays as reference, no longer maintained.

---

## ✅ Sprint 1 Complete — Foundation

### Monorepo & Stack
- ✅ **`dev/` monorepo scaffolded** on latest stable: React 19 + Vite 8 + Tailwind v4 (CSS-first) + react-router 7 + framer-motion 12 + lucide-react · NestJS 11 + Passport + mysql2 · MySQL 8 Docker on :3308 (container `manga-dev-mysql`, volume isolated) · pnpm workspaces (Node 20+, TypeScript 6).
- ✅ **Monorepo structure:** `dev/apps/{web,api}`, `dev/packages/shared` (@manga/shared), `dev/db` (schema + seed + docker-compose).
- ✅ **`@manga/shared` single source:** Role enum + auth DTOs (LoginDto, AuthUser, JwtPayload). Emits CommonJS for NestJS; Vite aliases for web. Tests pass (vitest).

### Design System & Theming
- ✅ **Sakura multi-role design system** (light, pastel, readable) — replaces heavy Inkframe:
  - Semantic tokens (--color-bg, --color-surface, --color-ink, --color-accent, --color-line) + global status colors (ok/info/warn/danger/muted).
  - Per-role skins: Mangaka (Sakura Studio coral), Assistant (Atelier teal), Tantou Editor (Red-Pencil Desk brick), Editorial Board (Boardroom indigo), Admin (Console blue).
  - `@theme inline` maps utilities; `[data-role="…"]` overrides plain CSS properties; components use semantic utilities only (no hardcoded hex).
  - `AppShell` sets `data-role={roleScope(user.role)}` from JWT → entire app re-skins automatically.
- ✅ **Token-driven components:** Panel, Button (accent/soft/ghost), Stamp, Input, Avatar, Progress, Sidebar. All use `rounded-[var(--app-radius)]`, `shadow-[var(--app-shadow)]`, etc. Soft borders + soft shadows everywhere.
- ✅ **Fonts:** Shippori Mincho (display), Zen Kaku Gothic New (body), Spline Sans Mono (mono); admin uses mono headings.

### Auth & RBAC
- ✅ **JWT auth:** email/password (bcryptjs) + Google OAuth; seeded user `dungminer69@gmail.com` / `Dung123456@` (MANGAKA). JWT payload: `{sub, email, name, role}`, 7-day expiry.
- ✅ **RolesGuard + @Roles decorator:** validates user.role against protected routes. Unit tests cover valid/invalid transitions.
- ✅ **Role-routed AppShell:** protected routes check `useAuth()`, redirect to `/login` if no token. Login page pre-skins to Mangaka (default). AuthCallback handles OAuth.

### Mangaka Dashboard
- ✅ **API endpoints:** `/dashboard/summary`, `/series`, `/tasks`, `/submissions`, `/notifications` (protected by JwtAuthGuard). Data aggregated from seeded schema.
- ✅ **Frontend re-theme:** Dashboard.tsx uses token utilities (no hard shadows/borders), pastel colors, soft Stamps for status, framer-motion stagger (reduced-motion aware). Vietnamese labels + `vi-VN` date formatting. Removed heavy grain/halftone.

### Docs Rewritten
- ✅ **`docs/design-system.md`** — Sakura multi-role architecture, token list, per-role palette table, component rules.
- ✅ **`.claude/rules/frontend.md`** — hard rules: semantic tokens, role theming at shell, soft shadows/borders only, fonts, icons.
- ✅ **`docs/roadmap.md`** — 3-sprint plan (S1 done, S2 production, S3 publishing/admin), FR→sprint mapping, DoD per sprint.
- ✅ **`docs/architecture.md`** — monorepo layout, multi-role theming flow, module-per-domain list, build/run, conventions.
- ✅ **`docs/domain-model.md`** — entity clusters (Users, Series, Production, Publishing, Support), status enums (TBD-from-SQL in S2), business rules sampling.
- ✅ **`CLAUDE.md`** updated: `dev/` layout, 3-sprint baseline, how-to-run steps, pnpm gotchas.
- ✅ **`docs/STATUS.md`** updated: Sprint 1 closed, phase set to S2, next-up clarified.

### Verification
- ✅ `pnpm db:up` boots MySQL, loads schema + seed.
- ✅ `pnpm dev:api` (or build + node dist/main.js) boots NestJS on 3000; routes listed; health check returns 200.
- ✅ `pnpm dev:web` boots Vite on 5173; proxies /api to 3000.
- ✅ Login flow: enter credentials → JWT signed + stored → redirect to dashboard → AppShell sets data-role → dashboard renders pastel.
- ✅ Role re-sking: `data-role` swap in devtools changes accent/bg/shadows instantly (proves one shell, many skins).
- ✅ `pnpm test` passes (shared Role enum tests, api RolesGuard tests).
- ✅ `pnpm build` produces web/dist (Vite) + api/dist/main.js (NestJS).

### Git
- ✅ Branch `dev/sprint1-foundation` (all work committed, squash-ready for PR to `development`).

## 🔄 In progress
- (none)

## ⏭️ Sprint 2 — Production Pipeline

**Scope:** Series Proposal → Series → Chapter → Page → Region → Task → Submission → Mangaka Review.

**High-level tasks:**
1. **Status enums:** Extract from `docs/domain-model.md` + `docs/SWP391/sql-script.sql`; code into `@manga/shared` (ProposalStatus, SeriesStatus, ChapterStatus, PageStatus, TaskStatus, SubmissionStatus, ManuscriptStatus, etc.). Add unit tests (vitest).
2. **NestJS modules (CRUD + state machines):** Series, Chapter, Page, Region, Task, Submission, with service-layer transition validation + RBAC guards.
3. **Web pages:** ProposalForm, SeriesList, ChapterForm, PageWorkspace (canvas + region selection), TaskList, SubmissionReview.
4. **Dashboards:** TANTOU_EDITOR task queue, EDITORIAL_BOARD approval list.
5. **Notifications:** Basic pub/sub on key transitions (task assigned, submission ready, approval requested).
6. **Database:** Extend schema if needed (e.g., Annotation polymorphism details).

**Definition of Done:** Create a series proposal end-to-end → board approve → series created → chapter created → page uploaded → region selected → task assigned → assistant submits → mangaka approves. All state machines honored, RBAC enforced, API + web tests pass.

## ❓ Open decisions
- **ORM:** raw mysql2 (S1 + S2) vs Prisma/TypeORM (consider at S2 kickoff when persistence grows). Current call: stay on mysql2 for MVP.
- **File storage:** local disk (MVP) → S3/object storage (NFR-29, S3+).
- **Email delivery:** stubs (S1+S2) → real SMTP (S3, production).
- **Session persistence:** in-memory JWT (S1) → localStorage + secure cookies (S2+, production).

## 🧭 Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-05-28 | Stack = React+Vite+TS / NestJS+TS / MySQL 8, no Next.js | Internal tool; NestJS + RBAC fit 101 FR; pnpm workspaces for monorepo. |
| 2026-05-28 | **Modernized to latest majors** (React 19 / Vite 8 / Tailwind v4 / NestJS 11 / TS 6) via `pnpm add @latest` | Per Dũng: use latest + correct method, never hand-pin from memory. |
| 2026-05-30 | **Sakura multi-role design system** (pastel, per-role skins via tokens) replaces Inkframe | User feedback: Inkframe heavy + hard to read. Sakura = light + readable + maintains manga spirit. |
| 2026-05-30 | **`dev/` is the real app** (demo stays as reference, not maintained) | Fresh monorepo on latest stack; cleaner starting point. |
| 2026-05-30 | **3-sprint baseline** (S1 Foundation, S2 Production, S3 Review/Publish/Admin) replaces 5-sprint plan | More realistic scope for 10-week window; allows focus on MVP spine. |
| 2026-05-30 | **Single-source `@manga/shared`** (Role enum + status enums) with CJS emit for API, Vite alias for web | Eliminates enum duplication; RBAC + theming both trust one Role source. |
| 2026-05-30 | **Data layer = raw mysql2 + future ORM decision** (no Prisma/TypeORM in S1) | Lowest risk S1; real app can migrate to ORM at S2/S3 with clear schema. |

## ⚠️ Gotchas to carry into future sprints

These are lessons learned in S1; S2+ must avoid them:

- **Always resolve versions with `pnpm add <pkg>@latest`** (or `create vite@latest` / `nest new`), never hand-write versions from memory — they go stale. Verify against official docs via WebFetch/WebSearch.
- **pnpm 11 build-script gate:** blocks dependency build scripts → write `allowBuilds: { "@nestjs/core": true, … }` to `pnpm-workspace.yaml`. (Old `onlyBuiltDependencies` list is ignored; don't use it.)
- **TypeScript 6** is stricter: requires explicit `rootDir` in tsconfig; `baseUrl` deprecated if no `paths`. Drop `baseUrl` for simplicity.
- **Tailwind v4 CSS-first:** No `tailwind.config.js` / `postcss.config.js` / `@tailwind` directives. Use `@import "tailwindcss";` + `@theme inline { … }` in CSS. The `@tailwindcss/vite` plugin handles everything.
- **UTF-8 everywhere:** SQL declare `SET NAMES utf8mb4;`; mysql2 pool use `charset: 'utf8mb4'`. Otherwise emoji/CJK → mojibake.
- **TS incremental + deleteOutDir:** nest-cli.json `deleteOutDir: true` + tsconfig `incremental: true` = **MUST have `"tsBuildInfoFile": "./dist/.tsbuildinfo"`** in tsconfig.json. Otherwise `dist/` is wiped but stale buildinfo survives → tsc skips emit → empty dist/ → Cannot find module 'dist/main'. This bit us hard in S1.
- **JWT bakes name at issue-time:** after a DB re-seed, users must re-login (JWT carries old name). Document for QA.
- **`@manga/shared` aliasing:** Vite aliases the TS source (`resolve.alias`); NestJS requires CJS dist at runtime. Keep the package's `build` script as `tsc -p tsconfig.json --noEmit` (typecheck only), and the Vite alias does the real work for dev. For production, consider emitting real CJS if needed.
