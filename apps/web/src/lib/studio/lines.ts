export interface Seg { x0: number; y0: number; x1: number; y1: number }

export function radialLines(cx: number, cy: number, count: number, maxLen: number): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    segs.push({
      x0: cx,
      y0: cy,
      x1: cx + Math.cos(a) * maxLen,
      y1: cy + Math.sin(a) * maxLen,
    });
  }
  return segs;
}

export function parallelLines(angleDeg: number, count: number, spacing: number, w: number, h: number): Seg[] {
  const a = (angleDeg * Math.PI) / 180;
  const nx = Math.cos(a);
  const ny = Math.sin(a);
  const px = -ny;
  const py = nx;
  const segs: Seg[] = [];
  const diag = Math.hypot(w, h);
  for (let i = 0; i < count; i++) {
    const off = (i - count / 2) * spacing;
    const ox = px * off + w / 2;
    const oy = py * off + h / 2;
    segs.push({
      x0: ox - nx * diag,
      y0: oy - ny * diag,
      x1: ox + nx * diag,
      y1: oy + ny * diag,
    });
  }
  return segs;
}
