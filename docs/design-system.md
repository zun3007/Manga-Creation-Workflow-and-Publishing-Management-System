# Frontend Design System — "Inkframe"

Aesthetic, tokens, and component rules for the manga workflow UI. This is the single
source of truth for frontend look & feel. Follow it across sessions — don't invent new
patterns.

## Aesthetic direction
**"Inkframe" — a manga-studio editorial aesthetic.** Ink on warm paper, screentone /
halftone texture, manga-panel framing, and a single hanko-red accent (the editor's stamp).
Refined, artful, print-inspired — designed **for mangaka**. Light "paper" theme is primary.

Avoid generic SaaS / AI looks: no Inter/Roboto/Arial, no purple-on-white gradients, no
flat material cards, no emoji icons.

## Principles
1. **Ink on paper** — warm paper background, near-black ink, high contrast, generous margins.
2. **Panels, not cards** — content framed like manga panels: thick ink border + hard offset shadow (no soft blur).
3. **One bold accent** — hanko vermilion for emphasis / CTA / active state only. Restraint elsewhere.
4. **Texture = atmosphere** — subtle paper grain + halftone dots; never flat fills.
5. **Typographic drama** — large elegant serif display; clean gothic body; mono for metadata/labels.
6. **Motion with intent** — one orchestrated staggered page-load; hover lifts; ink-reveal transitions. Respect `prefers-reduced-motion`.

## Color tokens (CSS variables)
```css
:root {
  --paper:   #F4F1EA;  --paper-2: #ECE7DB;  --paper-3: #E2DCCD;
  --ink:     #15120F;  --ink-2:   #3A352F;  --ink-3:   #6B645B;
  --vermilion: #E0271C; --vermilion-2: #B71E16;
  --sumi:  #243044;   /* secondary cool ink — info / in-progress */
  --jade:  #3C7A52;   /* success / approved / active */
  --amber: #C8861E;   /* warning / at-risk / revision */
  --line:  #15120F;   /* panel borders = ink */
}
```
**Status → color:** `APPROVED/ACTIVE/PUBLISHED → jade` · `IN_PROGRESS/SUBMITTED/REVIEWING → sumi` · `REVISION_REQUIRED/AT_RISK → amber` · `REJECTED/CANCELLED → vermilion` · `DRAFT/RAW → ink-3`.

## Typography (Google Fonts — distinctive, on-theme)
- **Display** (headings, hero, big numbers): `"Shippori Mincho", serif` — elegant Japanese print serif.
- **Body / UI**: `"Zen Kaku Gothic New", sans-serif` — clean, characterful gothic.
- **Mono** (labels, tags, IDs, metadata): `"Spline Sans Mono", monospace` — uppercase, letter-spaced.

Scale: hero display 3–5rem; h1 ~2rem; body ~0.95rem; mono labels ~0.72rem uppercase `tracking-[0.18em]`.

## Texture & effects
- **Paper grain**: fixed SVG `feTurbulence` overlay at ~3–4% opacity.
- **Halftone**: `radial-gradient` dot-pattern utility (`.halftone`) for headers/accents.
- **Panel**: `2px solid var(--ink)`; hard shadow `6px 6px 0 var(--ink)`; hover → `translate(-2px,-2px)` + shadow `8px 8px 0`.
- **Speed lines**: `repeating-linear-gradient` accent behind hero numbers / section breaks.

## Components to build
| Component | Spec |
|---|---|
| `Button` | `.btn-ink` (ink fill, paper text, hard shadow), `.btn-vermilion` (CTA), `.btn-ghost` (ink outline). |
| `Input` | paper bg, 2px ink underline, mono uppercase label; focus → vermilion underline. |
| `Panel` | framed manga panel; optional corner "page-number" tab. |
| `Stamp` (badge) | hanko-style status stamp — rounded-rect, colored border, mono uppercase. |
| `Sidebar` | vertical "studio" nav, ink on `--paper-2`, active = vermilion tab. |
| `Progress` | chapter completion as ink bar with halftone fill. |

## Motion
- Library: **framer-motion** (React).
- Page load: stagger children `0.06s`, fade + slide-up `12px`.
- Hover: panels lift; buttons grow shadow; nav underline ink-draw.
- Always gate behind `prefers-reduced-motion`.

## Stack notes
React 19 + Vite + TypeScript + **Tailwind CSS v4** + custom CSS for the distinctive bits
(grain, halftone, panel shadows) + framer-motion + lucide-react (line icons, restyled).
Custom components — no generic component-kit theme (would dilute the aesthetic).

**Tailwind v4 is CSS-first.** Design tokens live in `@theme` inside `index.css` as
`--color-*`, `--font-*`, `--shadow-*` (these generate `bg-*` / `text-*` / `font-*` / `shadow-*`
utilities). There is **no `tailwind.config.js` or `postcss.config.js`** — the `@tailwindcss/vite`
plugin handles everything, and `@import "tailwindcss";` replaces the old `@tailwind` directives.
Custom component classes (`.panel`, `.btn`, `.stamp`, `.halftone`…) reference `var(--color-*)`.
