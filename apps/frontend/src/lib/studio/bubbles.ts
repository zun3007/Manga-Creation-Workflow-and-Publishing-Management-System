export type BubbleType = 'round' | 'spiky' | 'thought';

export interface BubbleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawBubble(
  buf: Uint8ClampedArray,
  w: number,
  h: number,
  type: BubbleType,
  rect: BubbleRect,
  tail: { x: number; y: number },
) {
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  const rx = rect.width / 2, ry = rect.height / 2;

  const setpx = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a;
  };
  const seg = (xa: number, ya: number, xb: number, yb: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya)));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = xa + (xb - xa) * t, y = ya + (yb - ya) * t;
      setpx(x, y, 0, 0, 0, 255); setpx(x + 1, y, 0, 0, 0, 255);
    }
  };
  const tri = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    if (Math.abs(area) < 1e-6) return;
    const minx = Math.floor(Math.min(x1, x2, x3)), maxx = Math.ceil(Math.max(x1, x2, x3));
    const miny = Math.floor(Math.min(y1, y2, y3)), maxy = Math.ceil(Math.max(y1, y2, y3));
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const a1 = ((x2 - x) * (y3 - y) - (x3 - x) * (y2 - y)) / area;
      const a2 = ((x3 - x) * (y1 - y) - (x1 - x) * (y3 - y)) / area;
      const a3 = 1 - a1 - a2;
      if (a1 >= 0 && a2 >= 0 && a3 >= 0) setpx(x, y, 255, 255, 255, 255);
    }
  };
  const circle = (ccx: number, ccy: number, cr: number) => {
    for (let y = Math.floor(ccy - cr); y <= Math.ceil(ccy + cr); y++)
      for (let x = Math.floor(ccx - cr); x <= Math.ceil(ccx + cr); x++) {
        const dx = x - ccx, dy = y - ccy, dd = dx * dx + dy * dy;
        if (dd <= cr * cr) { const edge = dd > (cr - 1.6) * (cr - 1.6); setpx(x, y, edge ? 0 : 255, edge ? 0 : 255, edge ? 0 : 255, 255); }
      }
  };

  // --- Tail (drawn first; the bubble body is painted over its base for a clean join) ---
  const dx = tail.x - cx, dy = tail.y - cy, dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  if (type === 'thought') {
    const startR = Math.min(rx, ry);
    for (let k = 1; k <= 3; k++) {
      const along = startR + (k / 3.2) * dist * 0.9;
      circle(cx + ux * along, cy + uy * along, Math.max(2, startR * (0.32 - k * 0.07)));
    }
  } else {
    // tapered triangle pointing at the speaker (white fill + black sides)
    const pxn = -uy, pyn = ux;
    const baseHalf = Math.max(4, Math.min(rx, ry) * 0.38);
    const baseR = Math.min(rx, ry) * 0.9;
    const bcx = cx + ux * baseR, bcy = cy + uy * baseR;
    const ax = bcx + pxn * baseHalf, ay = bcy + pyn * baseHalf;
    const bx = bcx - pxn * baseHalf, by = bcy - pyn * baseHalf;
    tri(ax, ay, bx, by, tail.x, tail.y);
    seg(ax, ay, tail.x, tail.y);
    seg(bx, by, tail.x, tail.y);
  }

  // --- Bubble body: white fill + black ring (drawn after the tail) ---
  for (let y = Math.floor(rect.y); y < Math.ceil(rect.y + rect.height); y++)
    for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.width); x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      let limit = 1;
      if (type === 'spiky') {
        const ang = Math.atan2(ny, nx);
        limit = 0.8 + 0.2 * Math.abs(Math.sin(ang * 9));
      }
      const d = nx * nx + ny * ny;
      if (d <= limit) {
        const edge = d > limit - 0.16;
        setpx(x, y, edge ? 0 : 255, edge ? 0 : 255, edge ? 0 : 255, 255);
      }
    }
}
