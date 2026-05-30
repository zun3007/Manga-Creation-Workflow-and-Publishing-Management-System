import type { AIAssist } from './AIAssist';
import type { RectN } from '../types';
import type { StudioEngine } from '../engine';
import { MANGA_PALETTE, hexToRgb } from '../color';

const isInkAt = (px: Uint8ClampedArray, i: number) => {
  const o = i * 4;
  return px[o + 3] > 40 && (px[o] + px[o + 1] + px[o + 2]) / 3 < 110;
};

/** Connected components of non-ink pixels; bounding boxes over a min area fraction. */
export function detectPanels(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  minAreaFrac = 0.02
): RectN[] {
  const seen = new Uint8Array(w * h);
  const rects: RectN[] = [];
  const minArea = minAreaFrac * w * h;

  for (let s = 0; s < w * h; s++) {
    if (seen[s] || isInkAt(px, s)) continue;

    let minx = w,
      miny = h,
      maxx = 0,
      maxy = 0,
      area = 0;
    const st = [s];

    while (st.length) {
      const idx = st.pop()!;
      if (seen[idx] || isInkAt(px, idx)) continue;

      seen[idx] = 1;
      area++;

      const cx = idx % w;
      const cy = (idx / w) | 0;

      if (cx < minx) minx = cx;
      if (cx > maxx) maxx = cx;
      if (cy < miny) miny = cy;
      if (cy > maxy) maxy = cy;

      if (cx > 0) st.push(idx - 1);
      if (cx < w - 1) st.push(idx + 1);
      if (cy > 0) st.push(idx - w);
      if (cy < h - 1) st.push(idx + w);
    }

    if (area >= minArea) {
      rects.push({
        x: minx / w,
        y: miny / h,
        width: (maxx - minx + 1) / w,
        height: (maxy - miny + 1) / h,
      });
    }
  }

  return rects;
}

export function autoColorize(eng: StudioEngine): void {
  const w = eng.doc.width;
  const h = eng.doc.height;
  const comp = eng.composite();

  eng.addLayer('raster', 'AI Color');
  const id = eng.doc.activeLayerId!;
  eng.reorderLayer(id, 0); // beneath line art

  const buf = eng.getBuffer(id);
  const seen = new Uint8Array(w * h);
  let ci = 0;

  for (let s = 0; s < w * h; s++) {
    if (seen[s] || isInkAt(comp, s)) continue;

    const col = hexToRgb(MANGA_PALETTE[2 + (ci++ % (MANGA_PALETTE.length - 2))]);
    const st = [s];
    const region: number[] = [];

    while (st.length) {
      const idx = st.pop()!;
      if (seen[idx] || isInkAt(comp, idx)) continue;

      seen[idx] = 1;
      region.push(idx);

      const cx = idx % w;
      const cy = (idx / w) | 0;

      if (cx > 0) st.push(idx - 1);
      if (cx < w - 1) st.push(idx + 1);
      if (cy > 0) st.push(idx - w);
      if (cy < h - 1) st.push(idx + w);
    }

    if (region.length < 16) continue;

    for (const idx of region) {
      const o = idx * 4;
      buf[o] = col.r;
      buf[o + 1] = col.g;
      buf[o + 2] = col.b;
      buf[o + 3] = 255;
    }
  }

  eng.requestRender();
}

export class HeuristicAI implements AIAssist {
  detectPanels(px: Uint8ClampedArray, w: number, h: number, minAreaFrac = 0.02): RectN[] {
    return detectPanels(px, w, h, minAreaFrac);
  }

  colorize(eng: StudioEngine): void {
    autoColorize(eng);
  }
}
