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

## Monorepo layout (planned — not scaffolded yet)
```
apps/web         React + Vite frontend
apps/api         NestJS backend
packages/shared  shared TS types, enums, DTOs (single source for the ~12 status enums)
docs/            our knowledge base (below) + docs/SWP391/ (given course material)
```

## How to run
_TBD — fill in when scaffolded (web dev server, api dev server, DB setup, seed)._

## Conventions (summary — full detail in `docs/conventions.md`)
- TypeScript everywhere. Shared enums/types live in `packages/shared`; never duplicate status enums.
- One backend module per domain (Auth, Series, Chapter, Page, Task, Submission, Review, Publishing, Ranking…) — mirrors NFR-30.
- Validate input on both FE and BE; consistent JSON error shape; RBAC guards on every protected route.

## Frontend design style
- Single source of truth: `docs/design-system.md` (+ auto-loaded `.claude/rules/frontend.md` when editing `*.tsx`).
- Keep components consistent across sessions — follow the design system, don't invent new patterns.

## Doc map
| Need | Read |
|---|---|
| What's done / what's next | `docs/STATUS.md` |
| Project context | `docs/overview.md` |
| Architecture | `docs/architecture.md` _(planned)_ |
| Entities + status machines + business rules | `docs/domain-model.md` _(planned)_ |
| Coding conventions / API shape | `docs/conventions.md` _(planned)_ |
| Frontend design system | `docs/design-system.md` _(planned)_ |
| Sprint plan / FR→sprint / Definition of Done | `docs/roadmap.md` _(planned)_ |
| Given (course) docs — reference only | `docs/SWP391/` |

## Working agreements
- The given SWP391 docs (Requirements Matrix, Business Rules, ERD…) have known gaps.
  Prefer our own best practices and **note deviations in `docs/STATUS.md`** rather than implementing them literally.
- Communication: Vietnamese / English mix is fine; code, identifiers, and commit messages in English.
- Scope discipline: MVP first. AI auto-coloring / advanced AI segmentation / realtime collab / payments / mobile are **out of scope** (future).
