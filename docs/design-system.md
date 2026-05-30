# Frontend Design System — Sakura Multi-Role

Aesthetic, tokens, and component rules for the manga-studio workflow UI. **One component library, five role-based skins.** This is the single source of truth for frontend look & feel. Follow it across sessions — don't invent new patterns.

## Aesthetic direction

**Sakura Base + Per-Role Theming.** A light, pastel manga aesthetic with soft borders, soft shadows, and generous spacing — readable and friendly. Each of the five roles (Mangaka, Assistant, Tantou Editor, Editorial Board, Admin) gets a distinct color palette and density while sharing the same components and layouts.

- ✅ **Soft, pastel, readable:** thin borders (`1–1.5px`), soft shadows (`0 2px 8px` rgba), rounded corners, generous padding.
- ✅ **Role-aware skins:** one `AppShell` component sets `data-role={user.role}` at the root; CSS scopes override semantic tokens per role; utilities re-skin without code duplication.
- ✅ **Manga spirit, light weight:** serif display (Shippori Mincho), gothic body, mono for labels — no generic SaaS look.

## Token architecture (Tailwind v4 CSS-first)

Semantic tokens are plain CSS custom properties, overridden per role under `[data-role="…"]` scopes:

```css
/* ← Default = Mangaka "Sakura Studio" ← */
:root, [data-role="mangaka"] {
  --app-bg: #FBF7F4;
  --app-surface: #FFFFFF;
  --app-ink: #4A4039;
  --app-ink-soft: #8A8078;
  --app-line: #ECE2DA;
  --app-accent: #E58A86;      /* coral */
  --app-accent-2: #A8C8E0;    /* sky */
  --app-radius: 12px;
  --app-shadow: 0 2px 8px rgba(180,150,140,.12);
  --app-density: 1;           /* row padding multiplier */
}
[data-role="assistant"] {     /* Atelier — cool work-desk */
  --app-bg: #F4F7FA;
  --app-ink: #3E454C;
  --app-line: #E1E8ED;
  --app-accent: #5BA0B8;
  --app-accent-2: #7FC9B0;
  --app-shadow: 0 2px 8px rgba(120,150,170,.14);
  --app-density: .9;
}
[data-role="tantou_editor"] {  /* Red-Pencil Desk */
  --app-bg: #F7F4EF;
  --app-surface: #FFFDF9;
  --app-ink: #403A33;
  --app-line: #E4DBCD;
  --app-accent: #B5564A;      /* brick */
  --app-accent-2: #A8946F;    /* tan */
  --app-density: .9;
}
[data-role="editorial_board"] { /* Boardroom */
  --app-bg: #F3F3F8;
  --app-ink: #39373F;
  --app-line: #E2E1EC;
  --app-accent: #6E63A8;      /* indigo */
  --app-accent-2: #7E9AD0;    /* slate-blue */
  --app-density: .85;
}
[data-role="admin"] {         /* Console — utilitarian, dark-ready */
  --app-bg: #EEF1F4;
  --app-ink: #2E343B;
  --app-line: #D7DEE5;
  --app-accent: #3B82C4;      /* blue */
  --app-accent-2: #64748B;    /* slate */
  --app-radius: 6px;
  --app-shadow: none;
  --app-density: .8;
}
```

The `@theme inline` block maps these plain properties to semantic utilities:
```css
@theme inline {
  --color-bg: var(--app-bg);
  --color-surface: var(--app-surface);
  --color-ink: var(--app-ink);
  --color-ink-soft: var(--app-ink-soft);
  --color-line: var(--app-line);
  --color-accent: var(--app-accent);
  --color-accent-2: var(--app-accent-2);
  
  /* Global status colors (NOT overridden per role) */
  --color-ok: #5E9A72;        /* approved / active / published */
  --color-info: #5B8FBE;      /* in-progress / submitted / reviewing */
  --color-warn: #D49A52;      /* revision-required / at-risk */
  --color-danger: #D0746B;    /* rejected / cancelled */
  --color-muted: #9A8F84;     /* draft / raw */

  --font-display: "Shippori Mincho", serif;
  --font-sans: "Zen Kaku Gothic New", system-ui, sans-serif;
  --font-mono: "Spline Sans Mono", ui-monospace, monospace;
}
```

**How utilities re-skin:** `bg-surface` emits `background: var(--color-surface)` → points to `var(--app-surface)` → resolves to `#FFFFFF` under `:root` or `#FFFDF9` under `[data-role="tantou_editor"]`. No component-level overrides needed.

## Per-role palette table

| Role | Theme | BG | Surface | Accent | Accent-2 | Radius | Shadow | Density | Signature |
|---|---|---|---|---|---|---|---|---|---|
| **Mangaka** | Sakura Studio | `#FBF7F4` | `#FFF` | coral `#E58A86` | sky `#A8C8E0` | 12px | soft | 1.0 | warm, serif display, screentone whisper |
| **Assistant** | Atelier | `#F4F7FA` | `#FFF` | teal `#5BA0B8` | mint `#7FC9B0` | 12px | soft | 0.9 | cool, progress rings, busy visual |
| **Tantou Editor** | Red-Pencil Desk | `#F7F4EF` | `#FFFDF9` | brick `#B5564A` | tan `#A8946F` | 12px | soft | 0.9 | editorial, annotation pills, paper-like |
| **Editorial Board** | Boardroom | `#F3F3F8` | `#FFF` | indigo `#6E63A8` | slate-blue `#7E9AD0` | 12px | soft | 0.85 | formal, vote bars, ranked lists |
| **Admin** | Console | `#EEF1F4` | `#FFF` | blue `#3B82C4` | slate `#64748B` | 6px | none | 0.8 | utilitarian, data tables, status dots, mono |

Status colors are global (no per-role override) to ensure meaning is consistent across the studio.

## Typography (Google Fonts)

- **Display/Serif:** `"Shippori Mincho", serif` — h1, h2, large numbers, panels titles. Admin uses mono headings instead.
- **Body/Gothic:** `"Zen Kaku Gothic New", sans-serif` — UI text, labels, navigation.
- **Mono:** `"Spline Sans Mono", monospace` — IDs, metadata, status codes; always uppercase + `tracking-wider`.

Scale: display 2–3rem, h1 ~1.5rem, body ~0.95rem, mono ~0.72rem uppercase.

## Component rules (token-driven)

All components use semantic utilities (`bg-surface`, `text-ink`, `border-line`, `text-accent`, etc.) — never hardcode a role's palette. Examples:

- **Panel/Card:** `bg-surface border border-line rounded-[var(--app-radius)]` + `shadow-[var(--app-shadow)]`. No hard shadows or black borders.
- **Button (accent variant):** `bg-accent text-white` + `rounded-[calc(var(--app-radius)*0.66)]` + soft hover (e.g., `brightness-95`).
- **Stamp (status pill):** `bg-{ok|info|warn|danger|muted}/15 text-{ok|info|warn|danger|muted}` + `rounded-full`, mono uppercase label.
- **Input:** `bg-surface border border-line rounded-[calc(var(--app-radius)*0.6)]` + focus → `border-accent`, mono label above.
- **Sidebar/Nav:** `bg-surface border-r border-line` + active item `bg-accent/12 text-accent`.
- **Progress bar:** track `bg-bg border border-line`, fill `bg-accent`.

**Soft borders + soft shadows everywhere.** Never `border-2`, never `6px 6px 0`, never hard blacks or offsets.

## Motion

- Library: **framer-motion** (React).
- Page load: stagger children `0.06s`, fade + slide-up `12px`.
- Hover: panels brighten, buttons shift slightly, nav highlight glides.
- **Always gate behind `prefers-reduced-motion`.**

## Implementation notes

**Tailwind v4 is CSS-first.** No `tailwind.config.js` or `postcss.config.js`. All tokens live in CSS (`@theme inline` and `[data-role="…"]` scopes in `src/styles/theme.css`). The `@tailwindcss/vite` plugin processes this at build time.

Components live in `apps/web/src/components/ui/` and use the semantic utilities + the shared `var(--app-*)` properties. The `AppShell` component (in `apps/web/src/components/app/AppShell.tsx`) wraps the app and sets `data-role={roleScope(user.role)}` from the JWT, causing all child utilities to re-skin automatically.

**For future role skins:** only modify the per-role CSS block in `theme.css`; no component code changes needed.
