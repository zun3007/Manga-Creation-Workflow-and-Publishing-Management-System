# Sprint 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the real `dev/` monorepo on the latest stack, with a light/pastel manga design system that re-skins per role, auth + RBAC, and a re-themed Mangaka dashboard — closing Sprint 1.

**Architecture:** pnpm-workspace monorepo (`dev/apps/web`, `dev/apps/api`, `dev/packages/shared`). Frontend = React 19 + Vite + TS + Tailwind v4 (CSS-first). Multi-role theming uses Tailwind v4 `@theme inline` mapping semantic color tokens to plain CSS custom properties, which are overridden under `[data-role="…"]` scopes set at the app shell from the JWT role claim. Backend = NestJS 11 + mysql2 + Passport (JWT + Google OAuth), with a `RolesGuard` enforcing the shared `Role` enum.

**Tech Stack:** React 19, Vite, TypeScript 6, Tailwind CSS v4 (`@tailwindcss/vite`), react-router 7, framer-motion, lucide-react, NestJS 11, Passport, mysql2, bcryptjs, MySQL 8 (Docker), Vitest + RTL (web), Jest (api), pnpm.

**Branch:** `dev/sprint1-foundation` (already created off `development`). Commit per task; squash-merge to `development` via PR at the end.

---

## Detail calibration (read first)

This plan mixes two kinds of work; verbosity is calibrated to risk, never to laziness:
- **New / easy-to-get-wrong code** (theming tokens, `Role` enum, `RolesGuard`, workspace wiring): full code inline.
- **Ported code** from the verified-working `demo/`: each step names the **exact source file** and the **exact transforms** to apply. The source exists in-repo — reading it is more reliable than re-typing it. This is a concrete instruction, not a placeholder.
- **TDD** is applied to logic (shared enums, guard, auth service). Scaffolding and visual components are verified by **booting the app / preview screenshot**, where unit tests add little.

Carry-over gotchas live in the spec §8 — re-read before scaffolding: [design spec](../specs/2026-05-30-pastel-multirole-redesign-and-dev-setup-design.md).

---

## File structure (created by this plan)

```
dev/
├─ package.json                      # workspace root, scripts
├─ pnpm-workspace.yaml
├─ .npmrc                            # pnpm build-script + linker settings
├─ README.md                         # how to run
├─ db/
│  ├─ docker-compose.yml             # MySQL 8 :3307
│  ├─ 01-schema.sql                  # ported from demo/db
│  └─ 02-seed.sql                    # ported from demo/db
├─ packages/shared/
│  ├─ package.json                   # name "@manga/shared"
│  ├─ tsconfig.json
│  ├─ vitest.config.ts
│  └─ src/
│     ├─ index.ts                    # barrel
│     ├─ enums/role.ts               # Role enum (single source for RBAC + theming)
│     ├─ enums/role.test.ts
│     └─ dto/auth.ts                 # LoginDto, AuthUser shape
├─ apps/web/
│  ├─ package.json, vite.config.ts, tsconfig*.json, index.html
│  └─ src/
│     ├─ main.tsx, App.tsx
│     ├─ styles/theme.css            # @theme inline + per-role skins  ← core
│     ├─ index.css                   # @import "tailwindcss" + theme.css + base
│     ├─ lib/{api.ts,auth.tsx}       # ported from demo
│     ├─ components/ui/*             # Button, Panel, Stamp, Input, Sidebar, Progress, Avatar
│     ├─ components/app/AppShell.tsx # sets data-role + role nav
│     └─ pages/{Login,AuthCallback}.tsx, pages/mangaka/Dashboard.tsx
└─ apps/api/
   ├─ package.json, nest-cli.json, tsconfig*.json
   └─ src/
      ├─ main.ts, app.module.ts
      ├─ db/{db.module.ts,db.service.ts}        # ported
      ├─ users/{users.module.ts,users.service.ts}
      ├─ auth/{auth.module,auth.service,auth.controller,jwt.strategy,google.strategy}.ts
      ├─ auth/{jwt-auth.guard,google-oauth.guard,roles.guard}.ts + roles.decorator.ts  ← RBAC new
      ├─ seed/{seed.module,seed.service}.ts      # ported
      └─ dashboard/{dashboard.module,dashboard.service,dashboard.controller}.ts  # ported
```

---

## Task 0: Monorepo skeleton

**Files:**
- Create: `dev/pnpm-workspace.yaml`, `dev/package.json`, `dev/.npmrc`, `dev/README.md`

- [ ] **Step 1: Create workspace manifest**

`dev/pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create root package.json**

`dev/package.json`:
```json
{
  "name": "manga-workflow",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:web": "pnpm -F web dev",
    "dev:api": "pnpm -F api start:dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "db:up": "docker compose -f db/docker-compose.yml up -d",
    "db:down": "docker compose -f db/docker-compose.yml down"
  }
}
```

- [ ] **Step 3: Create .npmrc**

`dev/.npmrc` (the demo hit `ERR_PNPM_IGNORED_BUILDS`; allow the known-good native builds):
```
node-linker=isolated
strict-peer-dependencies=false
```

- [ ] **Step 4: Verify workspace resolves**

Run: `cd dev && pnpm install`
Expected: completes (no packages yet → "Already up to date" or empty lockfile created), no error.

- [ ] **Step 5: Commit**

```bash
git add dev/pnpm-workspace.yaml dev/package.json dev/.npmrc
git commit -m "chore(dev): pnpm workspace skeleton"
```

---

## Task 1: `packages/shared` — Role enum (single source for RBAC + theming)

**Files:**
- Create: `dev/packages/shared/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/enums/role.ts`, `src/enums/role.test.ts`, `src/dto/auth.ts`

> Scope note: Sprint 1 needs only `Role` (drives RBAC + theming). The ~12 status-machine enums (proposal/series/chapter/task/submission/…) are extracted from `docs/SWP391/sql-script.sql` in **Sprint 2** when those entities are built. The package is wired now so adding them is a one-file change.

- [ ] **Step 1: package.json**

`dev/packages/shared/package.json`:
```json
{
  "name": "@manga/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "build": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": { "typescript": "latest", "vitest": "latest" }
}
```
> Consumed as TS source via workspace alias — no build step needed for dev. `build` is typecheck-only.

- [ ] **Step 2: tsconfig.json**

`dev/packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing test**

`dev/packages/shared/src/enums/role.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { Role, ROLES, isRole } from "./role";

describe("Role", () => {
  it("has the five SWP05 roles", () => {
    expect(ROLES).toEqual([
      "MANGAKA", "ASSISTANT", "TANTOU_EDITOR", "EDITORIAL_BOARD", "ADMIN",
    ]);
  });
  it("Role enum maps to its own string value", () => {
    expect(Role.MANGAKA).toBe("MANGAKA");
    expect(Role.ADMIN).toBe("ADMIN");
  });
  it("isRole narrows valid/invalid strings", () => {
    expect(isRole("MANGAKA")).toBe(true);
    expect(isRole("nope")).toBe(false);
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `cd dev/packages/shared && pnpm test`
Expected: FAIL — `Cannot find module './role'`.

- [ ] **Step 5: Implement `role.ts`**

`dev/packages/shared/src/enums/role.ts`:
```ts
export enum Role {
  MANGAKA = "MANGAKA",
  ASSISTANT = "ASSISTANT",
  TANTOU_EDITOR = "TANTOU_EDITOR",
  EDITORIAL_BOARD = "EDITORIAL_BOARD",
  ADMIN = "ADMIN",
}

/** Ordered list — also the set of valid `data-role` theme scopes. */
export const ROLES = [
  Role.MANGAKA,
  Role.ASSISTANT,
  Role.TANTOU_EDITOR,
  Role.EDITORIAL_BOARD,
  Role.ADMIN,
] as const;

export function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

/** Lowercase scope used in the UI `data-role` attribute, e.g. "tantou_editor". */
export const roleScope = (r: Role): string => r.toLowerCase();
```

- [ ] **Step 6: Auth DTO + barrel**

`dev/packages/shared/src/dto/auth.ts`:
```ts
import { Role } from "../enums/role";

export interface LoginDto { email: string; password: string; }

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
}

/** Shape of the signed JWT payload. */
export interface JwtPayload { sub: number; email: string; name: string; role: Role; }
```

`dev/packages/shared/src/index.ts`:
```ts
export * from "./enums/role";
export * from "./dto/auth";
```

`dev/packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 7: Run test, verify it passes**

Run: `cd dev/packages/shared && pnpm install && pnpm test`
Expected: PASS — 3 tests green.

- [ ] **Step 8: Commit**

```bash
git add dev/packages/shared
git commit -m "feat(shared): Role enum + auth DTOs as single source for RBAC and theming"
```

---

## Task 2: `apps/web` scaffold + Tailwind v4 + fonts

**Files:**
- Create: `dev/apps/web/*` (via scaffold), modify `vite.config.ts`, `index.html`, add `@manga/shared` dep.

- [ ] **Step 1: Scaffold on latest**

Run: `cd dev/apps && pnpm create vite@latest web --template react-ts`
Expected: creates `dev/apps/web` (React 19 + TS template).

- [ ] **Step 2: Add deps (resolve @latest — never hand-pin)**

Run:
```bash
cd dev/apps/web
pnpm add react-router-dom framer-motion lucide-react axios "@manga/shared@workspace:*"
pnpm add -D tailwindcss @tailwindcss/vite
```
Expected: installs; `@manga/shared` linked from workspace.

- [ ] **Step 3: Wire the Tailwind v4 Vite plugin**

`dev/apps/web/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
});
```
> No `tailwind.config.js`, no `postcss.config.js` — v4 is CSS-first.

- [ ] **Step 4: Load fonts in index.html**

In `dev/apps/web/index.html` `<head>`, add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 5: Minimal index.css to prove Tailwind works**

`dev/apps/web/src/index.css`:
```css
@import "tailwindcss";
```
Replace `src/App.tsx` body with `<div className="p-8 text-3xl font-bold">Tailwind v4 OK</div>` and ensure `main.tsx` imports `./index.css`.

- [ ] **Step 6: Verify dev server boots**

Run: `cd dev/apps/web && pnpm dev` (or `./node_modules/.bin/vite` if pnpm blocks the build script).
Verify with preview tools: page renders "Tailwind v4 OK" bold/large (utility applied). Check `preview_console_logs` for zero errors.

- [ ] **Step 7: Commit**

```bash
git add dev/apps/web
git commit -m "chore(web): scaffold React 19 + Vite + Tailwind v4 + fonts"
```

---

## Task 3: Design tokens — Sakura base + per-role skins (CORE — verified architecture)

**Files:**
- Create: `dev/apps/web/src/styles/theme.css`
- Modify: `dev/apps/web/src/index.css`

> **Verified mechanism** (Tailwind v4 docs — `@theme inline` + data-attribute, see plan header): semantic utilities (`bg-accent`, `text-ink`, …) must reference **plain** custom properties so that overriding those plain props under `[data-role="…"]` re-skins everything in scope. `@theme inline` is what makes the generated utility emit `var(--app-accent)` instead of a frozen value.

- [ ] **Step 1: Write the theme stylesheet**

`dev/apps/web/src/styles/theme.css`:
```css
/* ── Plain skin variables. Default (:root) = Mangaka "Sakura Studio". ── */
:root,
[data-role="mangaka"] {
  --app-bg: #FBF7F4;
  --app-surface: #FFFFFF;
  --app-ink: #4A4039;
  --app-ink-soft: #8A8078;
  --app-line: #ECE2DA;
  --app-accent: #E58A86;     /* coral */
  --app-accent-2: #A8C8E0;   /* sky */
  --app-radius: 12px;
  --app-shadow: 0 2px 8px rgba(180,150,140,.12);
  --app-density: 1;          /* row padding multiplier */
}
[data-role="assistant"] {            /* Atelier — cool work-desk */
  --app-bg: #F4F7FA; --app-ink: #3E454C; --app-line: #E1E8ED;
  --app-accent: #5BA0B8; --app-accent-2: #7FC9B0;
  --app-shadow: 0 2px 8px rgba(120,150,170,.14); --app-density: .9;
}
[data-role="tantou_editor"] {        /* Red-Pencil Desk */
  --app-bg: #F7F4EF; --app-surface: #FFFDF9; --app-ink: #403A33; --app-line: #E4DBCD;
  --app-accent: #B5564A; --app-accent-2: #A8946F; --app-density: .9;
}
[data-role="editorial_board"] {      /* Boardroom */
  --app-bg: #F3F3F8; --app-ink: #39373F; --app-line: #E2E1EC;
  --app-accent: #6E63A8; --app-accent-2: #7E9AD0; --app-density: .85;
}
[data-role="admin"] {                /* Console — not manga */
  --app-bg: #EEF1F4; --app-ink: #2E343B; --app-line: #D7DEE5;
  --app-accent: #3B82C4; --app-accent-2: #64748B;
  --app-radius: 6px; --app-shadow: none; --app-density: .8;
}

/* ── Map semantic tokens → plain vars so utilities re-skin per [data-role] scope. ── */
@theme inline {
  --color-bg: var(--app-bg);
  --color-surface: var(--app-surface);
  --color-ink: var(--app-ink);
  --color-ink-soft: var(--app-ink-soft);
  --color-line: var(--app-line);
  --color-accent: var(--app-accent);
  --color-accent-2: var(--app-accent-2);

  /* Global status semantics (NOT overridden per role) */
  --color-ok: #5E9A72;
  --color-info: #5B8FBE;
  --color-warn: #D49A52;
  --color-danger: #D0746B;
  --color-muted: #9A8F84;

  --font-display: "Shippori Mincho", serif;
  --font-sans: "Zen Kaku Gothic New", system-ui, sans-serif;
  --font-mono: "Spline Sans Mono", ui-monospace, monospace;
}
```

- [ ] **Step 2: Base layer in index.css**

`dev/apps/web/src/index.css`:
```css
@import "tailwindcss";
@import "./styles/theme.css";

@layer base {
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4 { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.01em; }
  [data-role="admin"] h1, [data-role="admin"] h2, [data-role="admin"] h3 { font-family: var(--font-mono); letter-spacing: 0; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
}
```

- [ ] **Step 3: Prove re-skinning works**

Temporarily set `App.tsx`:
```tsx
export default function App() {
  return (
    <div className="flex gap-4 p-8">
      {["mangaka","assistant","tantou_editor","editorial_board","admin"].map((r) => (
        <div key={r} data-role={r} className="rounded-[var(--app-radius)] bg-surface p-4" style={{ boxShadow: "var(--app-shadow)" }}>
          <div className="h-10 w-10 rounded-lg bg-accent"></div>
          <p className="mt-2 text-ink">{r}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify each swatch shows a different accent**

Boot/reload web. Use `preview_screenshot`. Expected: five tiles, each `bg-accent` swatch a **different** color (coral / teal / brick / indigo / blue), admin tile square-ish (radius 6px, no shadow). This proves `data-role` re-skins via tokens. Revert `App.tsx` after.

- [ ] **Step 5: Commit**

```bash
git add dev/apps/web/src/styles/theme.css dev/apps/web/src/index.css
git commit -m "feat(web/theme): Sakura base + per-role skins via @theme inline data-role tokens"
```

---

## Task 4: UI component library (token-driven)

**Files:**
- Create: `dev/apps/web/src/components/ui/{Button,Panel,Stamp,Input,Avatar,Progress,Sidebar}.tsx`

> Reference (re-theme, don't copy raw): `demo/web/src/components/ui/{Button,Panel,Stamp}.tsx`, `demo/web/src/components/dashboard/Sidebar.tsx`. Transform rule: replace every hard Inkframe style — `border-2 border-ink`, `shadow-ink*`, `bg-vermilion`, `6px 6px 0` offsets, `.halftone`/`.grain` — with token utilities (`border border-line`, `bg-surface`, `bg-accent`, `shadow-[var(--app-shadow)]`, `rounded-[var(--app-radius)]`).

- [ ] **Step 1: Panel (full code — the base surface)**

`dev/apps/web/src/components/ui/Panel.tsx`:
```tsx
import type { ReactNode } from "react";
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`bg-surface border border-line rounded-[var(--app-radius)] ${className}`}
      style={{ boxShadow: "var(--app-shadow)" }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Button (full code — 3 variants on tokens)**

`dev/apps/web/src/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from "react";
type Variant = "accent" | "soft" | "ghost";
const styles: Record<Variant, string> = {
  accent: "bg-accent text-white hover:brightness-95",
  soft: "bg-surface text-ink border border-line hover:bg-bg",
  ghost: "bg-transparent text-ink hover:bg-bg",
};
export function Button({ variant = "accent", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[calc(var(--app-radius)*0.66)] px-4 py-2 font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...p}
    />
  );
}
```

- [ ] **Step 3: Stamp (full code — status pill, shared status colors)**

`dev/apps/web/src/components/ui/Stamp.tsx`:
```tsx
const tone: Record<string, string> = {
  ok: "bg-ok/15 text-ok", info: "bg-info/15 text-info",
  warn: "bg-warn/15 text-warn", danger: "bg-danger/15 text-danger",
  muted: "bg-muted/15 text-muted",
};
const map: Record<string, keyof typeof tone> = {
  APPROVED: "ok", ACTIVE: "ok", PUBLISHED: "ok",
  IN_PROGRESS: "info", SUBMITTED: "info", REVIEWING: "info",
  REVISION_REQUIRED: "warn", AT_RISK: "warn",
  REJECTED: "danger", CANCELLED: "danger",
  DRAFT: "muted", RAW: "muted",
};
export function Stamp({ status, label }: { status: string; label?: string }) {
  const t = tone[map[status] ?? "muted"];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider ${t}`}>
      {label ?? status}
    </span>
  );
}
```

- [ ] **Step 4: Input, Avatar, Progress, Sidebar**

Create each on the same token basis. Concrete transforms:
- `Input.tsx`: paper `bg-surface`, `border border-line rounded-[calc(var(--app-radius)*0.6)]`, focus → `border-accent`, mono uppercase `text-ink-soft` label. (was `.input-ink` underline in `demo/web/src/index.css`.)
- `Avatar.tsx`: port `demo/web/src/pages/Dashboard.tsx` `Avatar` fn; swap `border-2 border-ink` → `border border-line`, keep initials fallback.
- `Progress.tsx`: port `ProgressBar` from same file; track `bg-bg border border-line`, fill `bg-accent` (drop `.halftone`).
- `Sidebar.tsx`: port `demo/web/src/components/dashboard/Sidebar.tsx`; container `bg-surface border-r border-line`, active item `bg-accent/12 text-accent` (was vermilion tab); nav items come from a prop (set per role in Task 7).

- [ ] **Step 5: Verify in a gallery route**

Add a temporary `/__ui` route rendering one of each component inside `<div data-role="mangaka">` and `<div data-role="admin">`. Boot web, `preview_screenshot`. Expected: soft pastel under mangaka, square/neutral under admin; no hard black borders/shadows anywhere. Remove the temp route after.

- [ ] **Step 6: Commit**

```bash
git add dev/apps/web/src/components/ui
git commit -m "feat(web/ui): token-driven Panel/Button/Stamp/Input/Avatar/Progress/Sidebar"
```

---

## Task 5: `apps/api` scaffold + DB + shared wiring

**Files:**
- Create: `dev/apps/api/*` (scaffold), `dev/db/*` (ported), `dev/apps/api/src/db/*` (ported), `.env.example`

- [ ] **Step 1: Scaffold Nest**

Run: `cd dev/apps && nest new api --package-manager pnpm --skip-git`
Expected: NestJS 11 app in `dev/apps/api`.

- [ ] **Step 2: Add deps + shared**

```bash
cd dev/apps/api
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt passport-google-oauth20 bcryptjs mysql2 "@manga/shared@workspace:*"
pnpm add -D @types/passport-jwt @types/passport-google-oauth20
```

- [ ] **Step 3: Apply the demo's tsconfig fix**

In `dev/apps/api/tsconfig.json` `compilerOptions`, add `"tsBuildInfoFile": "./dist/.tsbuildinfo"` (prevents the empty-`dist/` boot failure documented in spec §8).

- [ ] **Step 4: Port DB + docker + schema/seed**

- Copy `demo/db/docker-compose.yml` → `dev/db/docker-compose.yml` (keep MySQL 8, port 3307, utf8mb4).
- Copy `demo/db/01-schema.sql`, `demo/db/02-seed.sql` → `dev/db/`.
- Port `demo/api/src/db/{db.module.ts,db.service.ts}` → `dev/apps/api/src/db/` unchanged (mysql2 pool, `charset: 'utf8mb4'`).
- Create `dev/apps/api/.env.example` mirroring `demo/api/.env.example` (DB creds, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, callback URL). Real `.env` stays gitignored.

- [ ] **Step 5: Health route + verify boot**

In `app.module.ts` import `DbModule` + `ConfigModule.forRoot({ isGlobal: true })`. Add a `GET /api` returning `{ ok: true }` (Nest's default `AppController` is fine).
Run: `cd dev && pnpm db:up` then `cd apps/api && node dist/main.js` (build first: `pnpm build`). 
Expected: Nest boots, logs routes, listening on `:3000/api`; `GET http://localhost:3000/api` → 200.

- [ ] **Step 6: Commit**

```bash
git add dev/apps/api dev/db
git commit -m "chore(api): scaffold NestJS 11 + DB module + docker MySQL (ported from demo)"
```

---

## Task 6: API auth (local + Google) + JWT role guard (RBAC)

**Files:**
- Port: `dev/apps/api/src/auth/{auth.module,auth.service,auth.controller,jwt.strategy,google.strategy,jwt-auth.guard,google-oauth.guard}.ts`, `dev/apps/api/src/users/{users.module,users.service}.ts`, `dev/apps/api/src/seed/*` — from `demo/api/src/...`
- Create (NEW): `dev/apps/api/src/auth/roles.decorator.ts`, `dev/apps/api/src/auth/roles.guard.ts`, `dev/apps/api/src/auth/roles.guard.spec.ts`

- [ ] **Step 1: Port auth + users + seed**

Copy the listed files from `demo/api/src/` verbatim. Then change the JWT payload + `validate` to use the shared types: import `JwtPayload`, `Role` from `@manga/shared`; ensure `auth.service` signs `{ sub, email, name, role }` and `jwt.strategy.validate` returns that payload. (Demo already signs name+role; just retype with shared.)

- [ ] **Step 2: Write the failing guard test**

`dev/apps/api/src/auth/roles.guard.spec.ts`:
```ts
import { RolesGuard } from "./roles.guard";
import { Role } from "@manga/shared";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";

const ctx = (role?: Role): ExecutionContext => ({
  switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  getHandler: () => ({}), getClass: () => ({}),
} as any);

describe("RolesGuard", () => {
  const make = (required?: Role[]) => {
    const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
    return new RolesGuard(reflector);
  };
  it("allows when no roles required", () => {
    expect(make(undefined).canActivate(ctx(Role.MANGAKA))).toBe(true);
  });
  it("allows when user role is in the required set", () => {
    expect(make([Role.ADMIN]).canActivate(ctx(Role.ADMIN))).toBe(true);
  });
  it("denies when user role is not allowed", () => {
    expect(make([Role.ADMIN]).canActivate(ctx(Role.MANGAKA))).toBe(false);
  });
  it("denies when there is no user", () => {
    expect(make([Role.ADMIN]).canActivate(ctx(undefined))).toBe(false);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `cd dev/apps/api && pnpm test roles.guard`
Expected: FAIL — cannot find `./roles.guard`.

- [ ] **Step 4: Implement decorator + guard**

`dev/apps/api/src/auth/roles.decorator.ts`:
```ts
import { SetMetadata } from "@nestjs/common";
import { Role } from "@manga/shared";
export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`dev/apps/api/src/auth/roles.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@manga/shared";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    return !!user && required.includes(user.role);
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `cd dev/apps/api && pnpm test roles.guard`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Verify auth end-to-end**

Run API + DB. 
- `POST /api/auth/login` with the seeded `dungminer69@gmail.com` / `Dung123456@` → 200 + `{ token, user:{ role:"MANGAKA" } }`.
- `GET /api/auth/google` → 302 to Google.
Quote the login JSON as evidence.

- [ ] **Step 7: Commit**

```bash
git add dev/apps/api/src/auth dev/apps/api/src/users dev/apps/api/src/seed
git commit -m "feat(api/auth): JWT + Google OAuth + RolesGuard RBAC on shared Role enum"
```

---

## Task 7: Web auth flow + role-routed shell (data-role from JWT)

**Files:**
- Port: `dev/apps/web/src/lib/{api.ts,auth.tsx}`, `dev/apps/web/src/pages/{Login,AuthCallback}.tsx` — from `demo/web/src/...`
- Create: `dev/apps/web/src/components/app/AppShell.tsx`
- Modify: `dev/apps/web/src/App.tsx`, `dev/apps/web/src/types.ts`

- [ ] **Step 1: Port api client + auth context**

Copy `demo/web/src/lib/{api.ts,auth.tsx}`. Retype `user` as `AuthUser` from `@manga/shared`. `auth.tsx` already decodes/stores the user from login response; ensure `user.role` is a `Role`.

- [ ] **Step 2: Port Login + AuthCallback, re-themed**

Copy `demo/web/src/pages/{Login,AuthCallback}.tsx`. Apply the Task-4 transform rule (Inkframe classes → tokens). Login uses `<Button variant="accent">` and token `Input`. Wrap Login in `<div data-role="mangaka">` (pre-login default skin = Sakura).

- [ ] **Step 3: AppShell sets data-role + role nav**

`dev/apps/web/src/components/app/AppShell.tsx`:
```tsx
import { useAuth } from "../../lib/auth";
import { roleScope } from "@manga/shared";
import { Sidebar } from "../ui/Sidebar";
import { NAV_BY_ROLE } from "./nav";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div data-role={roleScope(user.role)} className="min-h-screen bg-bg text-ink flex">
      <Sidebar items={NAV_BY_ROLE[user.role]} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
```
Create `dev/apps/web/src/components/app/nav.ts` exporting `NAV_BY_ROLE: Record<Role, NavItem[]>` — Sprint 1 only needs the Mangaka entry populated (Dashboard); others get a single Dashboard stub.

- [ ] **Step 4: Routing + protected routes**

`App.tsx`: `BrowserRouter` with `/login`, `/auth/callback`, and a protected `/` that renders `<AppShell><Dashboard/></AppShell>` when `user` exists else redirect to `/login`. (Port the protected-route pattern from `demo/web/src/App.tsx`.)

- [ ] **Step 5: Verify role re-skins the shell**

Boot web+api+db. Log in as the seeded MANGAKA. Expected (`preview_screenshot`): shell root has `data-role="mangaka"`, Sakura accent (coral) on the active nav item, pastel surfaces. Then in devtools (`preview_eval`) set `document.querySelector('[data-role]').dataset.role='admin'` → sidebar/active accent flips to blue, surfaces neutralize — confirms one shell, many skins.

- [ ] **Step 6: Commit**

```bash
git add dev/apps/web/src/lib dev/apps/web/src/pages dev/apps/web/src/components/app dev/apps/web/src/App.tsx dev/apps/web/src/types.ts
git commit -m "feat(web/auth): login + Google callback + role-routed AppShell (data-role from JWT)"
```

---

## Task 8: Mangaka dashboard — re-themed (the screen that was "too heavy")

**Files:**
- Port: `dev/apps/api/src/dashboard/*` from `demo/api/src/dashboard/*`
- Create: `dev/apps/web/src/pages/mangaka/Dashboard.tsx` (re-themed from `demo/web/src/pages/Dashboard.tsx`)

- [ ] **Step 1: Port dashboard API**

Copy `demo/api/src/dashboard/{dashboard.module,dashboard.service,dashboard.controller}.ts` verbatim; register in `app.module.ts`. Protect the controller with `@UseGuards(JwtAuthGuard)`.

- [ ] **Step 2: Re-theme the dashboard page**

Create `dev/apps/web/src/pages/mangaka/Dashboard.tsx` from the demo Dashboard with these exact transforms (this is the core "make it lighter" change):
- `StatCard`: use `<Panel className="p-4">`; number `font-display text-4xl text-ink` (alert → `text-warn`/`text-danger` via tokens, not raw vermilion/amber).
- Series row: `<Panel>` (soft) instead of `border-2 border-ink … shadow-ink`; rank badge `bg-accent/12 text-accent rounded-[var(--app-radius)]` (was `bg-ink text-paper`).
- Topbar: `border-b border-line bg-bg/95`; "Konnichiwa, <span className='text-accent'>{name}</span>".
- Replace every `Stamp` usage as-is (now token-based from Task 4). Drop `<GrainOverlay/>` heavy grain (or include at ≤2% only for mangaka).
- Keep the framer-motion stagger (gated by reduced-motion).

- [ ] **Step 3: Verify lighter look + behavior**

Boot full stack, log in as MANGAKA. 
- `preview_screenshot` → pastel dashboard: soft borders, soft shadows, coral accent, no hard black frames. 
- `preview_snapshot` → seeded series/tasks/submissions render, Vietnamese intact. 
- `preview_console_logs` → no errors.

- [ ] **Step 4: Commit**

```bash
git add dev/apps/api/src/dashboard dev/apps/web/src/pages/mangaka
git commit -m "feat(web/mangaka): re-themed pastel dashboard (replaces heavy Inkframe)"
```

---

## Task 9: Rewrite docs

**Files:**
- Modify: `CLAUDE.md`, `docs/STATUS.md`, `docs/design-system.md`, `.claude/rules/frontend.md`
- Create: `docs/roadmap.md`, `docs/architecture.md`, `docs/domain-model.md`

- [ ] **Step 1: `docs/design-system.md` — rewrite for Sakura multi-role**

Replace the "Inkframe" content with: aesthetic = light pastel manga; the `@theme inline` + `[data-role]` token architecture (copy the verified token list from `theme.css`); per-role skin table (from spec §3.3); component rules referencing tokens (no hard borders/offset shadows); status-color semantics; motion + reduced-motion. Keep the fonts section.

- [ ] **Step 2: `.claude/rules/frontend.md` — rewrite**

New hard rules: use semantic token utilities (`bg-surface`, `bg-accent`, `text-ink`, `border-line`, `shadow-[var(--app-shadow)]`); set theme by `data-role` at the shell, never hardcode a role's palette in a component; soft shadows + thin lines only; fonts unchanged; lucide icons. Point to `docs/design-system.md`.

- [ ] **Step 3: `docs/roadmap.md` — new**

3-sprint table (from spec §5) + FR→sprint mapping (Auth/RBAC+Dashboard→S1; Proposal/Series/Chapter/Page/Task/Submission/MangakaReview→S2; EditorReview/Publishing/Vote/Ranking/Decision/Admin/Notifications/Earnings→S3) + Definition of Done per sprint.

- [ ] **Step 4: `docs/architecture.md` — new**

`dev/` monorepo layout; pnpm workspace; `@manga/shared` as single source; NestJS module-per-domain list; web app structure (styles/components/pages); the multi-role theming flow (JWT role → `data-role` → token override); env/secrets handling.

- [ ] **Step 5: `docs/domain-model.md` — new (seed for S2)**

Entity clusters (from `docs/overview.md` §5) + the list of status state machines to be encoded in `@manga/shared` in S2, each with its source table in `docs/SWP391/sql-script.sql`. Mark statuses TBD-from-SQL explicitly as an S2 task (not a gap in S1).

- [ ] **Step 6: `CLAUDE.md` + `docs/STATUS.md` update**

- `CLAUDE.md`: change monorepo layout to `dev/apps/*` + `dev/packages/shared`; fill "How to run" (`pnpm db:up`, `pnpm dev:api`, `pnpm dev:web`); record the 3-sprint baseline + Git workflow; note `demo/` is reference-only.
- `docs/STATUS.md`: mark Sprint 1 done; set phase = "Sprint 2 — production pipeline"; move resolved items to decisions log (3-sprint baseline, pastel multi-role, `dev/` supersedes `demo/`); update Next-up to S2.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md docs/STATUS.md docs/design-system.md .claude/rules/frontend.md docs/roadmap.md docs/architecture.md docs/domain-model.md
git commit -m "docs: rewrite for pastel multi-role design system, dev/ monorepo, 3-sprint roadmap"
```

---

## Final: integrate Sprint 1

- [ ] **Step 1: Full verify**

Run from `dev/`: `pnpm db:up`, build + boot api, boot web. Confirm: login → Mangaka dashboard (pastel); `pnpm -r test` green (shared + api guard tests). Quote the test summary lines.

- [ ] **Step 2: Open PR `dev/sprint1-foundation` → `development`**

```bash
git push -u origin dev/sprint1-foundation
gh pr create --base development --head dev/sprint1-foundation \
  --title "Sprint 1 — foundation: dev/ monorepo + pastel multi-role design system + auth" \
  --body "Closes Sprint 1. See docs/superpowers/plans/2026-05-30-sprint1-foundation.md"
```

- [ ] **Step 3: Squash-merge to `development`** after review (per the Git workflow). `main` stays untouched until a release milestone.

---

## Self-review checklist (done while writing)

- **Spec coverage:** design system §3 → Tasks 3–4,8; `dev/` §4 → Tasks 0,2,5; 3-sprint §5 → Task 9/roadmap; Git §6 → header + Final; docs §7 → Task 9; gotchas §8 → Tasks 0,2,5; risks §9 (ORM) → deferred to S2 in Task 1 note & domain-model. ✓
- **Placeholder scan:** ported tasks name exact source files + transforms (concrete, not vague); status enums explicitly scoped to S2 with their source file, not a dangling TODO. ✓
- **Type consistency:** `Role`, `ROLES`, `roleScope`, `JwtPayload`, `AuthUser` from `@manga/shared` used identically across api (guard, strategy) and web (AppShell, auth). `RolesGuard(Reflector)` signature matches its test. ✓
