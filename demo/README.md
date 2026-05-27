# Inkframe — Demo (auth + Mangaka dashboard)

A self-contained slice of the Manga Creation Workflow system, built to demo for the
customer: **Google OAuth + email/password login → a beautiful Mangaka dashboard** styled
in the "Inkframe" manga-studio aesthetic. Throwaway-friendly — lives entirely under `demo/`.

```
demo/
├── docker-compose.yml   # MySQL 8 (port 3307), auto-loads schema + seed on first run
├── db/
│   ├── 01-schema.sql    # full project schema (+ OAuth columns on User)
│   └── 02-seed.sql      # fake data: users, series, chapters, tasks, submissions, ranking…
├── api/                 # NestJS + JWT + Passport (local + Google) + mysql2
└── web/                 # React + Vite + Tailwind + framer-motion (Inkframe design)
```

## Demo login
| Email | Password |
|---|---|
| `dungminer69@gmail.com` | `Dung123456@` |

Role: **MANGAKA**. The API re-applies this password (bcrypt) on every boot, so email/password
login always works. Google login works once you add OAuth credentials (see below).

---

## Prerequisites
- **Node 20+** and **pnpm** (`npm i -g pnpm`)
- **Docker Desktop** (running)

## Run it (3 terminals)

### 1) Database
```bash
cd demo
docker compose up -d         # MySQL on localhost:3307, schema + seed auto-loaded
```

### 2) API  → http://localhost:3000/api
```bash
cd demo/api
pnpm install                 # see "pnpm note" below if it complains about build scripts
pnpm build
node dist/main.js
```

### 3) Web  → http://localhost:5173
```bash
cd demo/web
pnpm install
node node_modules/vite/bin/vite.js     # dev server
```

Open **http://localhost:5173**, log in with the demo account → Mangaka dashboard.

> **pnpm note (pnpm 10/11):** pnpm blocks dependency build scripts by default, which makes
> `pnpm start` / `pnpm dev` abort with `ERR_PNPM_IGNORED_BUILDS`. Two options:
> - **Recommended:** run `pnpm approve-builds` once (select `esbuild` for web, `@nestjs/core`
>   for api), then the normal `pnpm start` (api) / `pnpm dev` (web) scripts work.
> - **No-approve fallback:** run the binaries directly as shown above
>   (`node dist/main.js`, `node node_modules/vite/bin/vite.js`).

### Stop
```bash
cd demo
docker compose down          # stop, keep data
docker compose down -v       # stop + wipe DB (re-seeds on next `up`)
```

---

## Google OAuth setup (for the "Tiếp tục với Google" button)

The Google button is wired up but disabled until you provide credentials. Until then it
redirects back with a friendly "not configured" message — email/password still works.

### 1. Create OAuth credentials
1. Go to **https://console.cloud.google.com/** → create (or pick) a project.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - App name: `Inkframe Demo`, user support email: your email.
   - **Test users** → add `dungminer69@gmail.com` (and any presenter Google account).
   - Save (you can leave it in "Testing" — no verification needed for test users).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/google/callback`
   - Create → copy the **Client ID** and **Client secret**.

### 2. Paste them into the API env
Edit `demo/api/.env`:
```ini
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 3. Restart the API
```bash
cd demo/api
node dist/main.js            # (rebuild with `pnpm build` only if you changed code)
```

Now click **"Tiếp tục với Google"** → Google consent → back to the dashboard. The account is
matched by email; if `dungminer69@gmail.com` signs in with Google, it links to the seeded
Mangaka user. Unknown Google emails are auto-provisioned as a Mangaka (demo convenience).

### How the flow works
```
/api/auth/google            → redirects to Google
/api/auth/google/callback   → verifies, issues JWT, redirects to
http://localhost:5173/auth/callback?token=…  → web stores token → dashboard
```

---

## Notes
- **Stack is latest:** web = React 19 + Vite 8 + **Tailwind v4** (CSS-first `@theme`, `@tailwindcss/vite` — no `tailwind.config.js`/`postcss.config.js`) + react-router 7 + framer-motion 12; api = NestJS 11 + TypeScript 6. Versions were resolved with `pnpm add @latest`.
- **DB port is 3307** on the host (mapped to container 3306) to avoid clashing with any local MySQL.
- Schema/seed only load on the **first** `docker compose up` (empty volume). After editing
  `db/*.sql`, run `docker compose down -v` then `up` to reload.
- The demo extends the base schema's `User` table with `google_id` + `auth_provider` and makes
  `password_hash` nullable (OAuth-only users). SQL files declare `SET NAMES utf8mb4` so
  Vietnamese seed data stores correctly.
- This is a demo slice, not the production app. The full system is planned per `docs/roadmap.md`.
