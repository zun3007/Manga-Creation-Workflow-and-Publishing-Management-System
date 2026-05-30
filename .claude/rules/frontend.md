---
description: Frontend design + React conventions for the manga workflow UI (auto-loads when editing frontend files)
paths:
  - "dev/apps/web/**/*.{tsx,ts,css}"
---

# Frontend rules — read `docs/design-system.md` for the full spec

**Aesthetic: Sakura Multi-Role.** Light, pastel, manga-friendly design with soft borders/shadows and five role-based skins. One component library, many looks.

## Hard rules

**Semantic tokens, never hardcoded colors:**
- Use Tailwind utilities mapped to semantic tokens: `bg-surface`, `bg-accent`, `text-ink`, `text-accent`, `border-line`, `shadow-[var(--app-shadow)]`, `rounded-[var(--app-radius)]`.
- Never write `bg-[#FBF7F4]` or `border-2 border-black` in a component.
- Soft shadows + soft borders only: `shadow-[var(--app-shadow)]` + `border border-line`, never hard blacks or offsets.

**Role theming at the shell, not in components:**
- The `AppShell` component sets `data-role={roleScope(user.role)}` at the app root via the JWT.
- Components are role-agnostic; they use semantic tokens and the token overrides apply per `[data-role="…"]` scope.
- Never hardcode a role's palette inside a component (e.g., don't write `if (user.role === "ADMIN")` to pick colors).

**Fonts:**
- Display/h1/h2: `Shippori Mincho` (serif) — except Admin, which uses `Spline Sans Mono` for headings.
- Body/UI: `Zen Kaku Gothic New` (sans-serif).
- Mono/labels/IDs: `Spline Sans Mono`, always uppercase + `tracking-wider`.
- NEVER Inter/Roboto/Arial/system fonts.

**Status semantics (global, not per-role):**
- `text-ok` / `bg-ok/15` for approved/active/published.
- `text-info` for in-progress/submitted/reviewing.
- `text-warn` for revision-required/at-risk.
- `text-danger` for rejected/cancelled.
- `text-muted` for draft/raw.

**Icons:**
- lucide-react only (line icons, restyled to semantic token colors).
- Never emoji as icons.

## React conventions

- TypeScript, function components, hooks. One component per file; PascalCase.
- Co-locate component styles; share tokens via CSS utilities + `var(--app-*)`.
- Motion via **framer-motion**; **always gate behind `prefers-reduced-motion`.**
- Keep components small; lift shared UI into `apps/web/src/components/ui/`.
- Data fetching through a typed API client; never hardcode secrets in the client.
- Component files in `apps/web/src/components/ui/` are the single source for shared UI; reuse across pages/routes.

## Tailwind v4 CSS-first

- **No `tailwind.config.js` or `postcss.config.js`** — all tokens live in `src/styles/theme.css`.
- `@theme inline { --color-bg: var(--app-bg); … }` maps semantic utilities to plain custom properties.
- `[data-role="…"]` blocks override the plain properties, causing utilities to re-skin.
- Use `rounded-[var(--app-radius)]`, `rounded-[calc(var(--app-radius)*0.66)]` for consistent curve sets.

**Follow `docs/design-system.md` exactly.** Don't introduce new visual patterns or role-specific code without updating the design-system doc first.
