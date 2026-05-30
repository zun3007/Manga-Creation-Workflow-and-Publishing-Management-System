# CLAUDE.md — Manga Creation Workflow & Publishing Management System (SU26SWP05)

> Internal workflow tool for a manga studio. **NOT a manga reader.** It digitizes the
> production pipeline:
> **Series proposal → Board approval → Chapter → Page → Region → Task → Submission →
> Mangaka review → Editor review → Publishing → Vote/Ranking → Decision.**

## ⚡ On re-entry (new session or after /compact) — READ FIRST
1. `docs/STATUS.md` — what's done, in progress, next, and open decisions.
2. `docs/overview.md` — full project context (actors, flow, scope).

Then continue from **"Next up"** in `STATUS.md`. Do NOT re-derive context from scratch.
After any meaningful change or decision, **update `docs/STATUS.md`**.

## Stack (decided)
- **Frontend:** React + Vite + TypeScript (internal tool → no Next.js / SSR needed).
- **Backend:** NestJS + TypeScript.
- **Database:** MySQL (reference schema: `docs/SWP391/sql-script.sql`). ORM: **TBD** — see STATUS open decisions.
- **Auth:** JWT, role-based. 5 roles: `MANGAKA`, `ASSISTANT`, `TANTOU_EDITOR`, `EDITORIAL_BOARD`, `ADMIN`.
- **Repo:** monorepo (npm/pnpm workspaces).

## Monorepo layout (built in `dev/`)
```
dev/
├─ apps/web         React 19 + Vite 8 + TypeScript + Tailwind v4 (pastel multi-role)
├─ apps/api         NestJS 11 + TypeScript + mysql2 + Passport (JWT + Google OAuth)
├─ packages/shared  @manga/shared — Role enum + auth DTOs (single source of truth)
├─ db/              docker-compose.yml (MySQL 8 on :3308) + schema + seed
├─ pnpm-workspace.yaml, package.json (workspace root + scripts)
└─ docs/            knowledge base (below) + docs/SWP391/ (given course material)
```

## How to run

1. **Install:** `cd dev && pnpm install`
2. **Database:** `pnpm db:up` (Docker MySQL 8 on 3308; loads schema + seed on first run)
3. **API:** `pnpm dev:api` (NestJS on 3000, or `pnpm -F api build && node apps/api/dist/main.js` for prod)
4. **Web:** `pnpm dev:web` (Vite on 5173, proxies /api to 3000)

**Seeded login:** `dungminer69@gmail.com` / `Dung123456@` (MANGAKA role)

**Notes:**
- pnpm 11 requires `allowBuilds` map in `pnpm-workspace.yaml` for native deps — auto-managed, or run binaries directly.
- TypeScript 6 requires explicit `rootDir`; drop `baseUrl` if no `paths`.
- Tailwind v4 is CSS-first (`@theme` in CSS, no `tailwind.config.js`).
- UTF-8: SQL declares `SET NAMES utf8mb4`; mysql2 pool uses `charset: 'utf8mb4'`.
- JWT bakes the user name at issue-time → re-login after a re-seed.

## Conventions (summary — full detail in `docs/conventions.md`)
- TypeScript everywhere. Shared enums/types live in `packages/shared`; never duplicate status enums.
- One backend module per domain (Auth, Series, Chapter, Page, Task, Submission, Review, Publishing, Ranking…) — mirrors NFR-30.
- Validate input on both FE and BE; consistent JSON error shape; RBAC guards on every protected route.

## Frontend design style (Sakura Multi-Role)
- Light, pastel, manga-friendly. One component set; five role-based skins via semantic tokens + `[data-role="…"]` CSS scopes.
- **Single source of truth:** `docs/design-system.md` (+ auto-loaded `.claude/rules/frontend.md` when editing `*.tsx`).
- **AppShell sets `data-role={user.role}`** at the root; components use semantic utilities (`bg-surface`, `text-accent`, `border-line`) that resolve per role.
- Keep components role-agnostic — never hardcode a role's palette inside a component.
- Follow the design system exactly; don't invent new visual patterns or token names.

## Doc map
| Need | Read |
|---|---|
| What's done / what's next | `docs/STATUS.md` |
| Project context | `docs/overview.md` |
| Architecture (monorepo, auth, theming flow) | `docs/architecture.md` |
| Entities + status machines + business rules | `docs/domain-model.md` |
| Frontend design system (Sakura multi-role tokens) | `docs/design-system.md` |
| Sprint plan / FR→sprint / Definition of Done | `docs/roadmap.md` |
| Given (course) docs — reference only | `docs/SWP391/` |

## Working agreements
- The given SWP391 docs (Requirements Matrix, Business Rules, ERD…) have known gaps.
  Prefer our own best practices and **note deviations in `docs/STATUS.md`** rather than implementing them literally.
- Communication: Vietnamese / English mix is fine; code, identifiers, and commit messages in English.
- Scope discipline: MVP first. AI auto-coloring / advanced AI segmentation / realtime collab / payments / mobile are **out of scope** (future).
