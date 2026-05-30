# Manga Creation Workflow & Publishing Management System

A monorepo for the internal manga studio workflow tool that digitizes the production pipeline:
**Series proposal → Board approval → Chapter → Page → Region → Task → Submission → Mangaka review → Editor review → Publishing → Vote/Ranking → Decision.**

This is **NOT** a manga reader — it's an operational tool for studio production management.

## Monorepo Layout

```
apps/web         React + Vite + TypeScript + Tailwind v4 frontend
apps/api         NestJS + TypeScript backend
packages/shared  Shared TypeScript enums, DTOs, and types
db/              MySQL database (Docker Compose)
```

## How to Run

### Prerequisites
- Node.js >= 20
- pnpm 11.0.9+
- Docker & Docker Compose (for database)

### Start the database
```bash
pnpm db:up
```

### Start the development servers
```bash
# Backend API (NestJS)
pnpm dev:api

# Frontend (React + Vite) — in another terminal
pnpm dev:web
```

### Other commands
```bash
# Build all packages
pnpm build

# Run tests
pnpm -r test

# Stop the database
pnpm db:down
```

## Architecture Notes

- **Auth**: JWT-based, role-based access control (RBAC)
  - Roles: `MANGAKA`, `ASSISTANT`, `TANTOU_EDITOR`, `EDITORIAL_BOARD`, `ADMIN`
- **Database**: MySQL with reference schema at `docs/SWP391/sql-script.sql`
- **Types**: Single source of truth for status enums in `packages/shared` — never duplicate

For full context, see the main README or `docs/overview.md` in the project root.
