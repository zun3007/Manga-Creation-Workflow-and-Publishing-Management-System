export interface Seg {
  x0: number; y0: number; x1: number; y1: number;
  /** optional per-end stroke width for tapering (defaults applied by drawLines) */
  w0?: number; w1?: number;
}

/* Legacy generators (kept for tests / simple uses) ------------------------- */
export function radialLines(cx: number, cy: number, count: number, maxLen: number): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    segs.push({ x0: cx, y0: cy, x1: cx + Math.cos(a) * maxLen, y1: cy + Math.sin(a) * maxLen });
  }
  return segs;
}

export function parallelLines(angleDeg: number, count: number, spacing: number, w: number, h: number): Seg[] {
  const a = (angleDeg * Math.PI) / 180;
  const nx = Math.cos(a), ny = Math.sin(a);
  const px = -ny, py = nx;
  const segs: Seg[] = [];
  const diag = Math.hypot(w, h);
  for (let i = 0; i < count; i++) {
    const off = (i - count / 2) * spacing;
    const ox = px * off + w / 2, oy = py * off + h / 2;
    segs.push({ x0: ox - nx * diag, y0: oy - ny * diag, x1: ox + nx * diag, y1: oy + ny * diag });
  }
  return segs;
}

/* Manga effect generators -------------------------------------------------- */

/**
 * 集中線 (concentration / focus lines): converge toward a focal point but stop
 * short of it, leaving a clear focal zone. Angles are jittered, lengths vary,
 * and each line tapers thin→thick from the focus outward (the manga look).
 */
export function focusLines(cx: number, cy: number, count: number, reach: number, focal: number, jitter = 0.7): Seg[] {
  const segs: Seg[] = [];
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = i * step + (Math.random() - 0.5) * step * jitter;
    const ca = Math.cos(a), sa = Math.sin(a);
    const inner = focal * (0.85 + Math.random() * 0.5); // clear-zone edge (varied)
    const outer = reach * (0.7 + Math.random() * 0.55); // outward reach (varied)
    segs.push({
      x0: cx + ca * inner, y0: cy + sa * inner,
      x1: cx + ca * outer, y1: cy + sa * outer,
      w0: 0.5, w1: 1.2 + Math.random() * 3.0, // thin at focus → thick outside
    });
  }
  return segs;
}

/** 流線 (speed / motion lines): a parallel sweep across the canvas, length-jittered + tapered. */
export function speedLines(angleDeg: number, count: number, spacing: number, w: number, h: number): Seg[] {
  const a = (angleDeg * Math.PI) / 180;
  const nx = Math.cos(a), ny = Math.sin(a);
  const px = -ny, py = nx;
  const diag = Math.hypot(w, h);
  const segs: Seg[] = [];
  for (let i = 0; i < count; i++) {
    const off = (i - count / 2) * spacing + (Math.random() - 0.5) * spacing * 0.4;
    const ox = px * off + w / 2, oy = py * off + h / 2;
    const half = diag * (0.5 + Math.random() * 0.5);
    segs.push({
      x0: ox - nx * half, y0: oy - ny * half,
      x1: ox + nx * half, y1: oy + ny * half,
      w0: 0.5, w1: 0.6 + Math.random() * 2.4,
    });
  }
  return segs;
}

/** Rasterize segments into a buffer with optional per-end taper (stamps disks). */
export function drawLines(
  buf: Uint8ClampedArray, w: number, h: number, segs: Seg[],
  color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }, defThick = 1.5,
) {
  const stamp = (cx: number, cy: number, rad: number) => {
    const r = Math.max(0.5, rad);
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const o = (y * w + x) * 4; buf[o] = color.r; buf[o + 1] = color.g; buf[o + 2] = color.b; buf[o + 3] = 255;
      }
    }
  };
  for (const s of segs) {
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    const n = Math.max(1, Math.ceil(len));
    const t0 = (s.w0 ?? defThick) / 2, t1 = (s.w1 ?? defThick) / 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      stamp(s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t, t0 + (t1 - t0) * t);
    }
  }
}
