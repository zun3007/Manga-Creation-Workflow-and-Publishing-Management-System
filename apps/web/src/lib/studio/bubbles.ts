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
  tail: { x: number; y: number }
) {
  const cx = rect.x + rect.width / 2,
    cy = rect.y + rect.height / 2,
    rx = rect.width / 2,
    ry = rect.height / 2;

  const setpx = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    buf[o] = r;
    buf[o + 1] = g;
    buf[o + 2] = b;
    buf[o + 3] = a;
  };

  // tail (drawn first so ellipse can overwrite the center)
  const n = Math.max(1, Math.floor(Math.hypot(tail.x - cx, tail.y - cy)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (type === 'thought' && i % 6 > 2) continue;
    setpx(cx + (tail.x - cx) * t, cy + (tail.y - cy) * t, 0, 0, 0, 255);
  }

  // ellipse (drawn after tail so the center is white)
  for (let y = Math.floor(rect.y); y < Math.ceil(rect.y + rect.height); y++) {
    for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.width); x++) {
      const nx = (x - cx) / rx,
        ny = (y - cy) / ry;
      let limit = 1;
      if (type === 'spiky') {
        const ang = Math.atan2(ny, nx);
        limit = 0.82 + 0.18 * Math.abs(Math.sin(ang * 8));
      }
      const d = nx * nx + ny * ny;
      if (d <= limit) {
        const edge = d > limit - 0.18;
        setpx(x, y, edge ? 0 : 255, edge ? 0 : 255, edge ? 0 : 255, 255);
      }
    }
  }
}
