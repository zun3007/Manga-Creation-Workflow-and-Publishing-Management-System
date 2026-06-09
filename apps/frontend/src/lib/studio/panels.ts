import type { RectN } from './types';

/* ============================================================================
 * Manga layout engine
 * Conventions (researched from manga paneling references):
 *  - Vertical gutter (between side-by-side panels) is NARROW; horizontal gutter
 *    (between rows) is ~3x wider — it paces the read and signals time/scene change.
 *  - Panels sit inside an inset "basic frame" (内枠) but a dramatic panel may BLEED
 *    (断ち切り / tachikiri) to the page edge for impact / openness.
 *  - Reading order is RIGHT-TO-LEFT, top-to-bottom; column widths are staggered
 *    across rows so vertical & horizontal gutters never form a clean cross.
 * ========================================================================== */

export const MARGIN = 0.05; // basic-frame inset from the trim
export const GUTTER_V = 0.016; // between columns (narrow)
export const GUTTER_H = 0.045; // between rows (~3x narrow)

export type BleedSide = 'top' | 'bottom' | 'left' | 'right';
export interface PanelSpec { w: number; bleed?: BleedSide[] }
export interface RowSpec { h: number; cols: PanelSpec[] }
export interface MangaLayout { id: string; label: string; rows: RowSpec[] }

/** Curated, manga-authentic page layouts (varied panel sizes + a few bleeds). */
export const MANGA_LAYOUTS: MangaLayout[] = [
  { id: 'shonen3', label: 'Shōnen · 3 tầng', rows: [
    { h: 1.0, cols: [{ w: 1 }] },
    { h: 1.1, cols: [{ w: 1.5 }, { w: 1.0 }] },
    { h: 1.0, cols: [{ w: 1 }] },
  ] },
  { id: 'action', label: 'Hành động · panel lớn', rows: [
    { h: 0.85, cols: [{ w: 1.0 }, { w: 1.6 }] },
    { h: 1.35, cols: [{ w: 1 }] },
    { h: 0.85, cols: [{ w: 1.6 }, { w: 1.0 }] },
  ] },
  { id: 'splashTop', label: 'Mở cảnh · bleed trên', rows: [
    { h: 1.5, cols: [{ w: 1, bleed: ['top', 'left', 'right'] }] },
    { h: 1.0, cols: [{ w: 1.0 }, { w: 1.3 }] },
  ] },
  { id: 'grid2x3', label: 'Dồn dập · 2×3 so le', rows: [
    { h: 1, cols: [{ w: 1.0 }, { w: 1.3 }] },
    { h: 1, cols: [{ w: 1.3 }, { w: 1.0 }] },
    { h: 1, cols: [{ w: 1.0 }, { w: 1.2 }] },
  ] },
  { id: 'establish', label: 'Toàn cảnh + 3 nhỏ', rows: [
    { h: 1.3, cols: [{ w: 1 }] },
    { h: 1.0, cols: [{ w: 1 }, { w: 1 }, { w: 1 }] },
  ] },
  { id: 'climaxBleed', label: 'Cao trào · bleed dưới', rows: [
    { h: 0.8, cols: [{ w: 1.0 }, { w: 1.0 }] },
    { h: 1.5, cols: [{ w: 1, bleed: ['bottom', 'left', 'right'] }] },
  ] },
  { id: 'yonkoma', label: '4-koma (4 ô dọc)', rows: [
    { h: 1, cols: [{ w: 1 }] }, { h: 1, cols: [{ w: 1 }] },
    { h: 1, cols: [{ w: 1 }] }, { h: 1, cols: [{ w: 1 }] },
  ] },
];

/** Build normalized frames in reading order (right-to-left, top-to-bottom). */
export function buildLayout(
  layout: MangaLayout,
  opt?: { margin?: number; gv?: number; gh?: number },
): RectN[] {
  const M = opt?.margin ?? MARGIN;
  const GV = opt?.gv ?? GUTTER_V;
  const GH = opt?.gh ?? GUTTER_H;
  const rows = layout.rows;
  const hSum = rows.reduce((a, r) => a + r.h, 0);
  const usableH = 1 - 2 * M - (rows.length - 1) * GH;
  const out: RectN[] = [];
  let y = M;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rh = usableH * (row.h / hSum);
    const cols = row.cols;
    const wSum = cols.reduce((a, c) => a + c.w, 0);
    const usableW = 1 - 2 * M - (cols.length - 1) * GV;
    let right = 1 - M; // RTL: start from the right edge of the basic frame
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const cw = usableW * (col.w / wSum);
      let fx = right - cw, fy = y, fw = cw, fh = rh;
      const b = col.bleed ?? [];
      if (b.includes('right') && c === 0) fw = 1 - fx;                 // rightmost → trim
      if (b.includes('left') && c === cols.length - 1) { fw = fx + fw; fx = 0; } // leftmost → trim
      if (b.includes('top') && r === 0) { fh = fy + fh; fy = 0; }
      if (b.includes('bottom') && r === rows.length - 1) fh = 1 - fy;
      out.push({ x: fx, y: fy, width: fw, height: fh });
      right = fx - GV;
    }
    y += rh + GH;
  }
  return out;
}

/** Suggest a varied manga page layout (used by the "Gợi ý bố cục" action). */
export function suggestMangaLayout(seed?: number): RectN[] {
  const i = seed != null
    ? ((seed % MANGA_LAYOUTS.length) + MANGA_LAYOUTS.length) % MANGA_LAYOUTS.length
    : Math.floor(Math.random() * MANGA_LAYOUTS.length);
  return buildLayout(MANGA_LAYOUTS[i]);
}

/* ============================================================================
 * Legacy uniform-grid templates (kept for the panel tests / simple grids)
 * ========================================================================== */
export type PanelTemplate = '1' | '2row' | '3row' | '4koma' | '2col' | '2x2' | '3x2';

function rows(counts: number[], g: number): RectN[] {
  const out: RectN[] = [];
  const rh = (1 - (counts.length + 1) * g) / counts.length;
  let y = g;
  for (const c of counts) {
    const cw = (1 - (c + 1) * g) / c;
    let x = g;
    for (let i = 0; i < c; i++) { out.push({ x, y, width: cw, height: rh }); x += cw + g; }
    y += rh + g;
  }
  return out;
}

export function templateFrames(t: PanelTemplate, gutter = 0.02): RectN[] {
  const g = gutter;
  switch (t) {
    case '1': return rows([1], g);
    case '2row': return rows([1, 1], g);
    case '3row': return rows([1, 1, 1], g);
    case '4koma': return rows([1, 1, 1, 1], g);
    case '2col': return rows([2], g);
    case '2x2': return rows([2, 2], g);
    case '3x2': return rows([2, 2, 2], g);
  }
}

export function drawFrameBorders(buf: Uint8ClampedArray, w: number, h: number, frames: RectN[], thickness = 3) {
  const set = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4; buf[o] = 0; buf[o + 1] = 0; buf[o + 2] = 0; buf[o + 3] = 255;
  };
  for (const f of frames) {
    const x0 = Math.round(f.x * w), y0 = Math.round(f.y * h);
    const x1 = Math.round((f.x + f.width) * w), y1 = Math.round((f.y + f.height) * h);
    for (let t = 0; t < thickness; t++) {
      for (let x = x0; x <= x1; x++) { set(x, y0 + t); set(x, y1 - t); }
      for (let y = y0; y <= y1; y++) { set(x0 + t, y); set(x1 - t, y); }
    }
  }
}
