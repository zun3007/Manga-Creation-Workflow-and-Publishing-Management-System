# Design — Pastel Multi-Role Redesign + `dev/` Setup + 3-Sprint Plan

- **Date:** 2026-05-30
- **Status:** Approved (verbal, Dũng) — pending spec review before planning
- **Topic:** Close Sprint 1 by (a) softening the UI to a light/pastel manga aesthetic with **per-role theming**, (b) standing up the real `dev/` monorepo (superseding `demo/`), (c) re-baselining the project to **3 sprints**, and (d) adopting a clean Git workflow.
- **Supersedes:** the heavy "Inkframe" look in `docs/design-system.md`; the "5-sprint" assumption from the given course docs; the planned root-level `apps/` layout in `CLAUDE.md`.

---

## 1. Why

User feedback: the current Mangaka UI (Inkframe — 2px black borders, hard `6px 6px 0` black offset shadows, harsh `#E0271C` vermilion, heavy grain/halftone) is **too heavy and hard to read**. Keep the manga spirit, but go **lighter + pastel**. Additionally, **each role should feel different** (Mangaka = manga style, Admin = admin-console style, etc.). The demo has served its purpose; we now build the real app and wrap Sprint 1.

## 2. Goals / Non-goals

**Goals**
- A light, pastel, manga-flavored design system with a maintainable **per-role theming** layer.
- A clean `dev/` monorepo on the latest stack, migrating the good parts of `demo/`.
- A 3-sprint roadmap mapping the 101 FR / MVP spine.
- A documented Git workflow (`main` / `development` / `dev/<backlog>`) + Conventional Commits.
- Rewritten knowledge-base docs.

**Non-goals (unchanged)**
- AI auto-coloring / advanced AI segmentation / realtime collab / payments / mobile — still future.
- Not rebuilding the demo in place; `demo/` is left as reference and **not deleted**.
- No new backend domain features in this Sprint-1-closeout beyond auth + dashboard (those are Sprint 2/3).

## 3. Design system — Sakura base + per-role themes

### 3.1 Architecture (the maintainable part)
**One** component library + token system; per-role differences are a thin **skin**, not a fork.

- Tailwind v4 CSS-first `@theme` defines **semantic tokens**: `--color-bg`, `--color-surface`, `--color-ink`, `--color-ink-soft`, `--color-accent`, `--color-accent-2`, `--color-line`, plus shared **status** tokens (`--color-ok`, `--color-info`, `--color-warn`, `--color-danger`, `--color-muted`).
- A role wrapper sets the skin: `<div data-role="mangaka">` (role comes from JWT/auth) overrides the semantic tokens via `[data-role="…"] { --color-accent: …; --density: … }`.
- **Components reference semantic tokens only** (never raw palette). So `Button`, `Panel`, `Stamp`, `Input`, `Table`, `Sidebar` are written once; switching `data-role` re-skins the whole app.
- Status-color **meaning is global** (approved=green, in-progress=blue, revision/at-risk=amber, rejected/cancelled=red, draft=gray); role themes may tint the exact hue but never the semantics.
- All soft shadows (`0 2px 8px` / `0 6px 20px` rgba), generous radius, thin (`1–1.5px`) lines in soft tones — never hard black offsets. Honor `prefers-reduced-motion`.

### 3.2 Shared typography
- Display/serif: `Shippori Mincho`. Body: `Zen Kaku Gothic New`. Mono: `Spline Sans Mono`.
- Admin leans mono/utilitarian; Board emphasizes display numerals; manga roles keep serif headings.

### 3.3 Per-role skins (starting palette — refine in build)

| Role | Theme name | bg | surface | accent | accent-2 | density | signature motif |
|---|---|---|---|---|---|---|---|
| **Mangaka** ★ | Sakura Studio | `#FBF7F4` | `#FFFFFF` | coral `#E58A86` | sky `#A8C8E0` | comfortable | soft screentone whisper, panel framing, serif display |
| **Assistant** | Atelier | `#F4F7FA` | `#FFFFFF` | teal/mint `#7FC9B0` | sky `#7FB4D6` | cozy-dense | progress ring, ink-drop earnings tracker |
| **Tantou Editor** | Red-Pencil Desk | `#F7F4EF` | `#FFFDF9` | brick `#B5564A` | tan `#A8946F` | medium-dense | annotation pill, red-pencil underline |
| **Editorial Board** | Boardroom | `#F3F3F8` | `#FFFFFF` | indigo/plum `#6E63A8` | slate-blue `#7E9AD0` | dense | vote/ranking bars, decision chips |
| **Admin** | Console | `#EEF1F4` | `#FFFFFF` | blue `#3B82C4` | slate `#64748B` | dense, dark-ready | data tables, status dots, mono labels |

Status hues (shared, tuned pastel): ok `#5E9A72`, info `#5B8FBE`, warn `#D49A52`, danger `#D0746B`, muted `#9A8F84`.

### 3.4 Component inventory (Sprint 1)
`Button` (solid-accent / soft / ghost) · `Panel`/`Card` (soft border + soft shadow, optional page-tab) · `Stamp` (status pill) · `Input` · `Sidebar` (role-skinned) · `Progress` · `Table` (admin/board) · `Avatar` · `GrainOverlay` (kept, opacity dropped way down or off by role). Built in `apps/web/src/components/ui/`, theme via tokens.

## 4. `dev/` monorepo structure (supersedes root `apps/`)

```
dev/
├─ apps/
│  ├─ web/        React 19 + Vite + TS + Tailwind v4 (Sakura multi-role theme)
│  └─ api/        NestJS 11 + TS
├─ packages/
│  └─ shared/     TS enums (~12 status state machines) + DTOs + types — single source
├─ db/            schema.sql + seed.sql + docker-compose.yml (MySQL 8, port 3307)
├─ pnpm-workspace.yaml
├─ package.json   (workspace root scripts: dev:web, dev:api, db:up, …)
└─ README.md      (how to run)
```

- **Scaffold fresh on latest** (`pnpm create vite@latest`, `nest new`, `pnpm add … @latest`) — never hand-pin versions (carry the demo's gotchas in §8).
- **Port from `demo/`** (re-themed, not copied verbatim): auth (email/password bcrypt+JWT + Google OAuth), the dashboard data flow, the design tokens (→ pastel), the MySQL schema+seed, the `tsBuildInfoFile` fix.
- `demo/` stays as-is for reference.

## 5. Three-sprint roadmap (re-baseline: 3 sprints, not 5)

Today 2026-05-30; project window 2026-05-18 → 2026-07-26 (10 wk). Dates are proposals, adjustable.

| Sprint | Window | Scope (MVP spine + FR domains) | Definition of Done |
|---|---|---|---|
| **S1 — Foundation** *(closing now)* | 30/05 → 13/06 | Pastel multi-role design system · `dev/` monorepo · `packages/shared` enums · Auth + RBAC (local + Google) · role-routed shell · Mangaka dashboard re-themed | `pnpm dev` boots web+api; login → role-routed dashboard; theme swaps by role; shared enums imported by both apps; verify green |
| **S2 — Production pipeline** | 14/06 → 04/07 | Series Proposal → Board approve → Series → Chapter → Page upload → Region select → Task assign → Submission → Mangaka review/revision | Create a series end-to-end through to approving an assistant submission; RBAC enforced; status machines honored |
| **S3 — Review · Publish · Govern + Admin** | 05/07 → 22/07 | Tantou review/annotation → Board schedule/approve → Publish → Vote import → Ranking/Risk → Decision · Admin (users/roles/config/audit) · Notifications · Assistant earnings | Full MVP spine demoable; admin can manage users/config; notifications fire on key transitions |

Week 10 (→ 26/07): testing, report, slide, demo.

**FR→sprint mapping** is detailed in `docs/roadmap.md` (to be written): Auth/RBAC + Dashboard → S1; Series Proposal, Series, Chapter, Page Workspace, Task, Submission, Mangaka Review → S2; Editor Review/Annotation, Publishing, Voting/Ranking/Decision, Admin, Notifications, Earnings → S3.

## 6. Git workflow

- `main` = **production**. Protected; only receives merges from `development` at sprint/release milestones.
- `development` = **integration**. Branched from `main` now; default PR target; always green.
- `dev/<backlog>` = **feature branches** off `development`. e.g. `dev/sprint1-foundation`, `dev/design-system-pastel`, `dev/auth-rbac`, `dev/series-proposal`. Merge back via squash PR.
- **Commits = Conventional Commits + module scope:** `feat(web/theme): add Sakura tokens`, `feat(api/auth): role guard`, `feat(shared): chapter status enum`, `docs(status): close sprint 1`, `chore(repo): pnpm workspace`.
- ⚠️ Namespace note: the **folder** `dev/` (holds code) and the **branch prefix** `dev/` (git refs) are independent — no collision.

## 7. Docs to rewrite/create

- `CLAUDE.md` — `dev/` layout, 3-sprint baseline, Git workflow, how-to-run.
- `docs/STATUS.md` — close S1, set new phase, update decisions log + deviations.
- `docs/design-system.md` — rewrite for Sakura + multi-role token architecture (replaces Inkframe).
- `.claude/rules/frontend.md` — rewrite to match (pastel, soft shadows, role tokens).
- **New:** `docs/roadmap.md` (3-sprint, FR→sprint, DoD), `docs/architecture.md` (`dev/` monorepo + NestJS modules), `docs/domain-model.md` (entities + status machines; may grow across sprints).

## 8. Carry-over gotchas (from demo, into `dev/`)
- Resolve versions with `@latest` / `create-latest`; never hand-pin.
- pnpm 10/11 blocks dependency build scripts → `pnpm approve-builds` once, or run binaries directly.
- TS 6: explicit `rootDir`; drop `baseUrl` if no `paths`.
- Tailwind v4 CSS-first: `@theme` in CSS, `@tailwindcss/vite`, no `tailwind.config.js`/`postcss.config.js`.
- UTF-8: SQL `SET NAMES utf8mb4`; mysql2 `charset: 'utf8mb4'`; re-login after re-seed (JWT bakes name).
- `deleteOutDir` + incremental TS → `"tsBuildInfoFile": "./dist/.tsbuildinfo"` inside `outDir`.
- Schema gap: `User` needs `google_id` + `auth_provider`, nullable `password_hash` (fold into real schema).

## 9. Risks / open items
- **ORM choice** (Prisma vs TypeORM vs raw mysql2) — still open; decide at S2 start when real persistence lands. S1 can stay on mysql2 like the demo.
- **Role detection for theming**: role from JWT claim → set `data-role` at the app shell root after login.
- Sprint dates are estimates; S2 is the heaviest and may borrow from S3.
- Theming palettes in §3.3 are a starting point; final hues tuned during build against real screens.
