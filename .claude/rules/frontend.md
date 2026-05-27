---
description: Frontend design + React conventions for the manga workflow UI (auto-loads when editing frontend files)
paths:
  - "demo/web/**/*.{tsx,ts,css}"
  - "apps/web/**/*.{tsx,ts,css}"
---

# Frontend rules — read `docs/design-system.md` for the full spec

**Aesthetic: "Inkframe"** — manga-studio editorial. Ink on warm paper, halftone texture,
manga-panel framing, single hanko-red accent. Light "paper" theme primary.

## Hard rules
- **Fonts:** `Shippori Mincho` (display/serif), `Zen Kaku Gothic New` (body), `Spline Sans Mono` (labels). NEVER Inter/Roboto/Arial/system fonts.
- **Color:** use CSS variables from `docs/design-system.md` (`--paper`, `--ink`, `--vermilion`, …). No purple gradients, no flat gray SaaS cards.
- **Panels not cards:** thick ink border + hard offset shadow (`6px 6px 0`), never soft blur.
- **Accent discipline:** vermilion only for CTA / active / emphasis.
- **Texture:** always add paper grain + halftone where appropriate; never plain flat fills.
- **Icons:** line icons (lucide), restyled to ink — no emoji as icons.

## React conventions
- TypeScript, function components, hooks. One component per file; PascalCase.
- Co-locate component styles; share tokens via CSS variables / Tailwind theme.
- Motion via **framer-motion**; gate behind `prefers-reduced-motion`.
- Keep components small and focused; lift shared UI into a `components/ui/` folder.
- Data fetching through a typed API client; never hardcode secrets in the client.

Follow `docs/design-system.md` exactly. Don't introduce new visual patterns without updating it.
