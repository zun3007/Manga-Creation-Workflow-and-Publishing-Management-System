# Architecture — Monorepo, Multi-Role Theming, RBAC

---

## 1. Monorepo layout (`dev/`)

```
dev/
├─ package.json                           # workspace root + scripts
├─ pnpm-workspace.yaml
├─ .npmrc                                 # pnpm config (isolated linker, strict-peer=false)
├─ README.md                              # how to run
│
├─ apps/
│  ├─ web/                                # React 19 + Vite + Tailwind v4
│  │  ├─ src/
│  │  │  ├─ main.tsx, App.tsx            # entry + root router
│  │  │  ├─ styles/
│  │  │  │  ├─ theme.css                 # @theme inline + [data-role="…"] token scopes
│  │  │  │  └─ index.css                 # @import "tailwindcss" + base layer
│  │  │  ├─ lib/
│  │  │  │  ├─ api.ts                    # axios client + Bearer token intercept
│  │  │  │  └─ auth.tsx                  # AuthProvider + useAuth hook
│  │  │  ├─ components/
│  │  │  │  ├─ ui/                       # token-driven: Panel, Button, Stamp, Input, Avatar, Progress, Sidebar
│  │  │  │  └─ app/
│  │  │  │     ├─ AppShell.tsx           # sets data-role + wraps layout
│  │  │  │     └─ nav.ts                 # NAV_BY_ROLE: Record<Role, NavItem[]>
│  │  │  ├─ pages/
│  │  │  │  ├─ Login.tsx, AuthCallback.tsx
│  │  │  │  └─ mangaka/
│  │  │  │     └─ Dashboard.tsx           # re-themed pastel dashboard
│  │  │  └─ types.ts                      # Summary, Series, Task, Submission, AppNotification
│  │  ├─ vite.config.ts                   # Vite + React + Tailwind v4 plugin + proxy to /api
│  │  ├─ tsconfig.json, tsconfig.app.json
│  │  └─ package.json                     # @manga/shared workspace: dep
│  │
│  └─ api/                                # NestJS 11 + Passport JWT + mysql2
│     ├─ src/
│     │  ├─ main.ts, app.module.ts       # Nest bootstrap + module registration
│     │  ├─ db/
│     │  │  ├─ db.module.ts              # mysql2 pool provider
│     │  │  └─ db.service.ts
│     │  ├─ auth/
│     │  │  ├─ auth.module.ts            # Passport JWT + Google OAuth + guards
│     │  │  ├─ auth.service.ts           # sign JWT { sub, email, name, role }
│     │  │  ├─ auth.controller.ts        # POST /auth/login, GET /auth/google
│     │  │  ├─ jwt.strategy.ts
│     │  │  ├─ google.strategy.ts
│     │  │  ├─ jwt-auth.guard.ts         # @UseGuards(JwtAuthGuard)
│     │  │  ├─ google-oauth.guard.ts
│     │  │  ├─ roles.guard.ts             # @UseGuards(RolesGuard) + @Roles(…)
│     │  │  ├─ roles.decorator.ts
│     │  │  └─ roles.guard.spec.ts        # unit tests
│     │  ├─ users/
│     │  │  ├─ users.module.ts
│     │  │  └─ users.service.ts           # find/create user, hash password
│     │  ├─ seed/
│     │  │  ├─ seed.module.ts
│     │  │  └─ seed.service.ts            # one-time seeder (if no users)
│     │  ├─ dashboard/                    # S1 scope
│     │  │  ├─ dashboard.module.ts
│     │  │  ├─ dashboard.service.ts
│     │  │  ├─ dashboard.controller.ts
│     │  │  └─ dashboard.spec.ts
│     │  └─ (planned S2+: Series, Chapter, Page, Task, Submission, …)
│     ├─ nest-cli.json, tsconfig.json, tsconfig.build.json
│     └─ package.json                     # @manga/shared workspace dep
│
├─ packages/
│  └─ shared/                             # Single source for enums + types
│     ├─ src/
│     │  ├─ index.ts                      # barrel
│     │  ├─ enums/
│     │  │  └─ role.ts                    # Role enum + ROLES list + isRole() + roleScope()
│     │  └─ dto/
│     │     └─ auth.ts                    # LoginDto, AuthUser, JwtPayload
│     ├─ vitest.config.ts
│     └─ package.json                     # name: "@manga/shared", main: src/index.ts
│
├─ db/
│  ├─ docker-compose.yml                  # MySQL 8 on :3308, container: manga-dev-mysql
│  ├─ 01-schema.sql                       # CREATE TABLE…
│  └─ 02-seed.sql                         # INSERT test data (seeded user, series, tasks, etc.)
```

**Workspace commands** (root `package.json`):
```bash
pnpm dev:web         # Vite on 5173
pnpm dev:api         # NestJS dev on 3000
pnpm dev:all         # both in parallel (with pnpm -r)
pnpm build           # build all packages
pnpm test            # test all packages
pnpm db:up           # docker compose up
pnpm db:down         # docker compose down
```

---

## 2. Package management & shared types

### `@manga/shared` as single source

The package exports the **Role enum** (drives RBAC + theming) and auth DTOs (LoginDto, AuthUser, JwtPayload, status enums in future sprints).

**Key property:** emits **CommonJS** at build time (so NestJS API can `require()` enums at runtime), but **web aliasing** in `vite.config.ts` imports the TS source directly (Vite doesn't need CJS):

```ts
// vite.config.ts: resolve aliases
resolve: {
  alias: {
    "@manga/shared": resolve(__dirname, "../../packages/shared/src"),
  },
}
```

This makes the package transparent to both consumers while keeping a single source.

### pnpm build-script quirk (pnpm 10+)

pnpm 11 requires explicit `allowBuilds` map in `pnpm-workspace.yaml`:
```yaml
allowBuilds:
  "@nestjs/core": true
  "unrs-resolver": true
  # add more as needed
```

(The older `onlyBuiltDependencies` list is ignored.) If a dependency fails to build, `pnpm install` will tell you which one — add it to the list and retry.

---

## 3. Frontend structure

### Multi-role theming flow

1. **User logs in** (email/password or Google OAuth).
2. **API returns JWT** with `{ sub, email, name, role: "MANGAKA" | "ASSISTANT" | … }`.
3. **Web stores JWT** in auth context (via `useAuth()` hook).
4. **AppShell reads user.role** → sets `data-role={roleScope(user.role)}` on the root div.
5. **CSS `[data-role="mangaka"]` block** overrides semantic tokens (--color-accent, --color-bg, etc.).
6. **All components use semantic utilities** (bg-accent, text-ink, etc.) → resolve to the current role's values.
7. **Result:** one codebase, five skins, no component duplication.

### Component rules

All UI components live in `apps/web/src/components/ui/` and follow these rules:

- ✅ Use semantic Tailwind utilities: `bg-surface`, `text-ink`, `border-line`, `shadow-[var(--app-shadow)]`.
- ✅ Use token-aware helpers: `rounded-[var(--app-radius)]`, `var(--app-density)` for spacing.
- ❌ Never hardcode colors, shadows, or borders (`bg-[#FBF7F4]`, `shadow-lg`, `border-2 border-black`).
- ❌ Never read `user.role` to pick styles (the AppShell sets the scope; components are role-agnostic).

**Example: Panel component:**
```tsx
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

Re-skins automatically when `data-role` changes.

### Pages & routing

- `pages/Login.tsx` — pre-login; renders inside `<div data-role="mangaka">` (default skin).
- `pages/AuthCallback.tsx` — OAuth redirect handler (swaps token in URL for stored JWT).
- `pages/mangaka/Dashboard.tsx` — Mangaka-specific dashboard (S1 only; other dashboards planned S2+).
- Protected routes check `useAuth()` and redirect to `/login` if no token.

---

## 4. Backend structure

### Database (MySQL 8, Docker)

**Connection:**
```bash
pnpm db:up              # docker compose up (loads schema + seed)
# MySQL on localhost:3308, user root, password root, db manga
# For API: process.env.DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
```

**Schema:** `docs/SWP391/sql-script.sql` extended for S2+ (Series, Chapter, Page, Region, Task, Submission, …).

**Seed:** `02-seed.sql` includes test user `dungminer69@gmail.com` (password `Dung123456@`, role MANGAKA) + sample data.

### Auth & RBAC

**JWT structure:**
```ts
{
  sub: 123,                    // User ID
  email: "mangaka@studio.jp",
  name: "Tanaka Manga",
  role: "MANGAKA",             // Role from `@manga/shared`
  iat: 1718000000,
  exp: 1718604800              // 7 days
}
```

**Guards & decorators:**
```ts
@UseGuards(JwtAuthGuard)              // Verify JWT is valid
@UseGuards(RolesGuard)                // Check user.role against decorator
@Roles(Role.MANGAKA, Role.ADMIN)      // Only these roles allowed
public async approveSubmission() { }
```

**Services:**
- `AuthService`: sign JWT, validate password (bcrypt), handle Google OAuth.
- `UsersService`: find/create/update user, hash password.
- `DbService`: mysql2 pool, query runner (query/queryOne/insert/update/delete).

### Module-per-domain (S1 structure, S2+ extends)

**S1 modules (built):**
- `AuthModule` — JWT strategy + Google strategy + guards + routes.
- `UsersModule` — user CRUD + password ops.
- `DbModule` — mysql2 pool provider.
- `SeedModule` — one-time seed runner.
- `DashboardModule` — Mangaka dashboard endpoints.

**S2+ modules (planned):**
- `SeriesModule` — proposal, series, status transitions.
- `ChapterModule` — chapter CRUD + status machine.
- `PageModule` — page upload, versioning.
- `TaskModule` — task assignment + tracking.
- `SubmissionModule` — submission upload + review flow.
- `ReviewModule` — Tantou editor annotation + approval.
- `PublishingModule` — schedule + publish + vote import.
- `RankingModule` — ranking computation + risk detection.
- `AdminModule` — user/role/config management.
- `NotificationModule` — async event publishing.
- `EarningModule` — assistant earnings tracking + disputes.

Each module owns its own entity, service, controller, and tests.

### Error handling & validation

**ValidationPipe** (auto in `main.ts`) validates DTOs against class-validator rules:
```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

**Consistent error shape:**
```json
{
  "statusCode": 400,
  "message": "email must be an email",
  "error": "Bad Request"
}
```

---

## 5. Environment & secrets

### Local dev (`.env`)

```
DB_HOST=localhost
DB_PORT=3308
DB_USER=root
DB_PASSWORD=root
DB_NAME=manga

JWT_SECRET=dev-secret-not-for-prod-use-bcryptjs-or-rsa

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/callback

NODE_ENV=development
```

**Web:** no secrets in `.env` (all client-side code is visible). JWT is stored in auth context + local storage (if persistent login desired).

**API:** `@nestjs/config` loads `.env` into `process.env`, injected via `ConfigService`.

### Production (not yet)

- Use environment-specific `.env.production`.
- Secrets (JWT_SECRET, GOOGLE_*) from a secret manager (AWS Secrets Manager, Vault, etc.).
- Database on managed service (RDS, Planetscale, etc.).

---

## 6. Build & deployment

### Local development

```bash
cd dev
pnpm install
pnpm db:up                    # Docker MySQL
pnpm -F @manga/shared build   # typecheck shared (optional in dev)
pnpm dev:api &                # in one terminal (or use pnpm dev:all)
pnpm dev:web                  # in another
# Web on 5173, proxies /api to 3000
```

### Production build

```bash
cd dev
pnpm build                    # all packages
# apps/web/dist/              → static HTML + JS (serve via nginx / Vercel / Netlify)
# apps/api/dist/main.js       → node apps/api/dist/main.js
```

### Docker (future S2+)

- Dockerfile for API (Node 20 + NestJS).
- nginx reverse-proxy config (static web + API proxy).
- `docker-compose.yml` for local dev includes mysql; production uses cloud DB.

---

## 7. Testing

### Shared (`@manga/shared`)

**vitest** — unit tests for enums and type guards:
```bash
cd packages/shared && pnpm test
```

### API

**jest** — controller + service tests:
```bash
pnpm -F api test
```

Examples:
- `auth.service.spec.ts` — sign/verify JWT, hash password.
- `roles.guard.spec.ts` — role matching logic.
- `dashboard.service.spec.ts` — data aggregation queries.

### Web

**vitest + RTL** (planned S2+) — component + page tests:
```bash
pnpm -F web test
```

---

## 8. Conventions (summary)

| Aspect | Rule |
|---|---|
| **Language** | TypeScript strict mode, everywhere. |
| **Imports** | `@manga/shared` for cross-package types. ESNext modules for vite, CommonJS for NestJS runtime (via @manga/shared). |
| **Naming** | PascalCase components, camelCase functions/variables, UPPER_SNAKE enums. |
| **Errors** | 400 = bad request, 401 = unauthorized, 403 = forbidden, 500 = server error. Controllers validate + throw, services handle logic. |
| **Async** | async/await, never `.then()` chains. |
| **Git** | Branch `dev/sprint-X-*` from `development`, squash-merge via PR. Conventional Commits: `feat(web/theme):`, `fix(api/auth):`, `docs(status):`. |
| **Env** | `.env.example` in repo; `.env` gitignored. ConfigService for API, no secrets in web. |
| **DB** | utf8mb4 collation. Foreign keys ON DELETE CASCADE (where appropriate). Migrations versioned (future). |

---

## 9. Risks & open items

- **ORM choice:** decided to stay on raw mysql2 for S1; pick Prisma/TypeORM at S2 kickoff if needed.
- **Email delivery:** S3 notifications use stubs; production needs SMTP config.
- **Session storage:** demo uses in-memory auth context (lost on refresh). S2 can add persistent JWT storage (localStorage + secure httpOnly cookie for production).
- **File storage:** S1 dashboard uses API stubs; S2 page upload needs disk/S3 integration (NFR-29).
- **Scaling:** mysql2 pool size + connection pooling; consider read replicas + caching (Redis) at S3 review.

