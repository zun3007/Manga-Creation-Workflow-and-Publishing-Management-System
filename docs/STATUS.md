# STATUS — living progress log

> **AI: read this first on every re-entry.** Update it after any meaningful change or decision.
> Keep it short and current. Older detail belongs in the per-topic docs.

- **Last updated:** 2026-05-30
- **Current phase:** **Task 7 complete:** Web app auth flow + role-routed shell (`dev/apps/web`). Login page re-themed to Inkframe tokens. AppShell sets `data-role` from JWT to skin the entire UI per role.
- **Last fix (2026-05-28):** `demo/api` build silently produced empty `dist/` → `nest start` failed with `Cannot find module 'dist/main'`. Root cause: `nest-cli.json:deleteOutDir=true` wipes `dist/` but `tsconfig.build.tsbuildinfo` (TS incremental cache) lived at root, survived the wipe, made tsc skip emit. Fix: added `"tsBuildInfoFile": "./dist/.tsbuildinfo"` to `demo/api/tsconfig.json` so the cache is wiped together with `dist/`. Verified: `node dist/main.js` boots Nest, all routes mapped, listening on :3000/api.
- **Calendar:** Week ~2 of 10 (project runs 2026-05-18 → 2026-07-26).

---

## ✅ Done
- Read & synthesized all given docs in `docs/SWP391/` (schema, 101 FR + 46 NFR, ~154 business rules, sprint/timeline).
- AI-context docs: `CLAUDE.md`, `.gitignore`, `docs/overview.md`, `docs/STATUS.md`.
- Frontend design system **"Inkframe"** (manga-studio editorial): `docs/design-system.md` + `.claude/rules/frontend.md`.
- **Task 7:** Web app auth flow + role-routed shell (`dev/apps/web/src/`):
  - `lib/api.ts` (axios + Bearer token intercept), `lib/auth.tsx` (AuthProvider + useAuth hook).
  - `pages/Login.tsx` (centered card, re-themed to Inkframe tokens using Panel/Button/Input + motion).
  - `pages/AuthCallback.tsx` (reads `?token=...` from Google OAuth callback, stores via auth context).
  - `components/app/nav.ts` (nav items per role).
  - `components/app/AppShell.tsx` (wraps children, sets `data-role={roleScope(user.role)}` to skin entire UI).
  - `App.tsx` (BrowserRouter + protected routes, AuthProvider wrapper).
  - **Build verified:** `pnpm build` passes tsc + vite build.
- **Demo built, modernized to latest, and verified** (`demo/`, see `demo/README.md`):
  - **Stack (latest, resolved via `pnpm add`):** Web = React 19 + Vite 8 + **Tailwind v4** (CSS-first `@theme`, `@tailwindcss/vite`) + react-router 7 + framer-motion 12 + lucide 1 + TypeScript 6. API = NestJS 11 + TS 6 + mysql2 + Passport.
  - MySQL 8 via Docker (port 3307), utf8mb4, auto-loads `db/01-schema.sql` + `db/02-seed.sql` (fake data incl. `dungminer69@gmail.com` / `Dung123456@`, MANGAKA).
  - Auth verified: email/password (bcrypt+JWT) ✓, **Google OAuth LIVE** ✓ (`/api/auth/google` 302 → Google with real client_id; creds in `demo/api/.env`, gitignored).
  - Dashboard verified in browser (Tailwind v4): design intact, Vietnamese renders correctly, seeded data shows.

## 🔄 In progress
- (Task 7 complete; Task 8 = Mangaka dashboard placeholder)

## ⏭️ Next up
1. **Task 8:** Mangaka dashboard (replace DashboardPlaceholder in App.tsx with real page). Outline: series list + chapter list + status filters. Use UI components from `src/components/ui/`.
2. Real app architecture docs: `docs/architecture.md` (monorepo structure), `docs/domain-model.md`, `docs/conventions.md`.
3. Build-out dashboard for other roles (Task 9+).

## ❓ Open decisions
- **ORM:** Prisma vs TypeORM vs raw mysql2 (demo uses **mysql2**). Decide for the real app.
- **Workspace tool:** npm vs pnpm (pnpm has the build-script quirk below).
- **File storage:** local disk (MVP) → object storage later (NFR-29).
- **Testing strategy:** Jest (api) + Vitest/RTL (web)? E2E?

## 🧭 Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-05-28 | Stack = React+Vite+TS / NestJS+TS / MySQL, no Next.js | Internal tool; team chose Node+React; NestJS fits 101 FR + RBAC |
| 2026-05-28 | Frontend aesthetic = "Inkframe" (ink-on-paper manga editorial) | "Art-forward, for mangaka" brief |
| 2026-05-28 | Demo data layer = raw mysql2 (not an ORM) | Lowest-risk for the demo; doesn't lock the real app's ORM |
| 2026-05-28 | **Modernized demo to latest majors** (React 19 / Vite 8 / Tailwind v4 / NestJS 11 / TS 6) via `pnpm add` | Per Dũng: use latest + correct method, not hand-pinned-from-memory versions |

## ⚠️ Deviations / gotchas (carry into the real app)
- **Always resolve versions with `pnpm add <pkg>@latest`** (or `create vite@latest` / `nest new`), never hand-write versions from memory — they go stale. Verify against current docs.
- **pnpm 10/11 blocks dependency build scripts** → `pnpm start` / `pnpm dev` / `pnpm exec` abort with `ERR_PNPM_IGNORED_BUILDS`. Fixes: `pnpm approve-builds` once, OR run binaries directly (`node dist/main.js`, `./node_modules/.bin/vite`). esbuild works anyway (binary via optional dep).
- **TypeScript 6.0** is stricter: requires explicit `rootDir`; `baseUrl` is deprecated (remove it if no `paths`).
- **Tailwind v4** = CSS-first: `@import "tailwindcss";` + `@theme { --color-*; --font-*; --shadow-* }` in CSS, `@tailwindcss/vite` plugin. **No `tailwind.config.js`, no `postcss.config.js`, no `@tailwind` directives.**
- **UTF-8:** SQL files declare `SET NAMES utf8mb4;` (docker-entrypoint loads via latin1 otherwise → mojibake); mysql2 pool uses `charset: 'utf8mb4'`. JWT bakes the name at issue-time → re-login after a re-seed.
- **Schema gap:** demo `User` adds `google_id` + `auth_provider` and makes `password_hash` nullable. Fold into real schema if keeping Google login.
- **TS incremental + `deleteOutDir`:** when `nest-cli.json` has `deleteOutDir: true` AND `tsconfig.json` has `incremental: true`, the `.tsbuildinfo` MUST live inside `outDir` (`"tsBuildInfoFile": "./dist/.tsbuildinfo"`), else `dist/` is wiped but the stale buildinfo makes tsc skip emit → empty `dist/` → `Cannot find module 'dist/main'`. Carry this into the real `apps/api`.
