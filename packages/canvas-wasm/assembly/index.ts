// AssemblyScript. Low-level heap (runtime=minimal gives real heap.alloc/free).
export function alloc(size: i32): i32 { return heap.alloc(size) as i32; }
export function free(ptr: i32): void { heap.free(ptr); }

// Smoke: fill w*h RGBA buffer at ptr with solid color.
export function fillRect(ptr: i32, w: i32, h: i32, r: i32, g: i32, b: i32, a: i32): void {
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const o = ptr + (i << 2);
    store<u8>(o,     r as u8);
    store<u8>(o + 1, g as u8);
    store<u8>(o + 2, b as u8);
    store<u8>(o + 3, a as u8);
  }
}

// ---- helpers ----
// @inline
function px(ptr: i32, i: i32): i32 { return ptr + (i << 2); }

// ---- floodFill: scanline, 4-connected, tolerance on RGBA distance ----
export function floodFill(ptr:i32, w:i32, h:i32, x:i32, y:i32, r:i32,g:i32,b:i32,a:i32, tol:i32): i32 {
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  const n = w * h;
  const start = px(ptr, y * w + x);
  const sr = load<u8>(start), sg = load<u8>(start+1), sb = load<u8>(start+2), sa = load<u8>(start+3);
  if (sr == (r as u8) && sg == (g as u8) && sb == (b as u8) && sa == (a as u8)) return 0;
  const visited = heap.alloc(n);
  memory.fill(visited, 0, n);
  const stack = heap.alloc(n << 2);
  let sp = 0;
  store<i32>(stack + (sp << 2), y * w + x); sp++;
  let count = 0;
  const t2 = tol * tol * 4;
  while (sp > 0) {
    sp--; const idx = load<i32>(stack + (sp << 2));
    if (load<u8>(visited + idx) != 0) continue;
    store<u8>(visited + idx, 1);
    const o = px(ptr, idx);
    const dr = (load<u8>(o) as i32) - (sr as i32);
    const dg = (load<u8>(o+1) as i32) - (sg as i32);
    const db = (load<u8>(o+2) as i32) - (sb as i32);
    const da = (load<u8>(o+3) as i32) - (sa as i32);
    if (dr*dr + dg*dg + db*db + da*da > t2) continue;
    store<u8>(o, r as u8); store<u8>(o+1, g as u8); store<u8>(o+2, b as u8); store<u8>(o+3, a as u8);
    count++;
    const cx = idx % w, cy = idx / w;
    if (cx > 0)   { store<i32>(stack + (sp<<2), idx - 1); sp++; }
    if (cx < w-1) { store<i32>(stack + (sp<<2), idx + 1); sp++; }
    if (cy > 0)   { store<i32>(stack + (sp<<2), idx - w); sp++; }
    if (cy < h-1) { store<i32>(stack + (sp<<2), idx + w); sp++; }
  }
  heap.free(visited); heap.free(stack);
  return count;
}

// ---- composite: src OVER dst with layer opacity + blend mode, straight alpha ----
// @inline
function blendChannel(mode:i32, cb:f32, cs:f32): f32 {
  switch (mode) {
    case 1: return cb * cs;                       // multiply
    case 2: return cb + cs - cb * cs;             // screen
    case 3: return cb <= 0.5 ? 2*cb*cs : 1 - 2*(1-cb)*(1-cs); // overlay
    case 4: { const v = cb + cs; return v > 1 ? 1 : v; }      // add
    case 5: return cb < cs ? cb : cs;             // darken
    case 6: return cb > cs ? cb : cs;             // lighten
    default: return cs;                            // normal
  }
}
export function composite(dst:i32, src:i32, w:i32, h:i32, opacity:f32, mode:i32): void {
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const od = px(dst, i), os = px(src, i);
    const sa = (load<u8>(os+3) as f32) / 255.0 * opacity;
    if (sa <= 0) continue;
    const da = (load<u8>(od+3) as f32) / 255.0;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) { store<u8>(od+3, 0); continue; }
    for (let c = 0; c < 3; c++) {
      const cb = (load<u8>(od+c) as f32) / 255.0;
      const cs0 = (load<u8>(os+c) as f32) / 255.0;
      const cs = blendChannel(mode, cb, cs0);
      const outC = (cs * sa + cb * da * (1 - sa)) / outA;
      store<u8>(od+c, (outC * 255.0) as u8);
    }
    store<u8>(od+3, (outA * 255.0) as u8);
  }
}

// ---- brushStamp: soft round dab, alpha-blended into buffer ----
export function brushStamp(ptr:i32, w:i32, h:i32, cx:f32, cy:f32, radius:f32, hardness:f32, r:i32,g:i32,b:i32,a:i32, flow:f32): void {
  const minx = max(0, (cx - radius) as i32), maxx = min(w-1, (cx + radius) as i32);
  const miny = max(0, (cy - radius) as i32), maxy = min(h-1, (cy + radius) as i32);
  const inner = radius * hardness;
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const dx = (x as f32) - cx, dy = (y as f32) - cy;
      const d = Mathf.sqrt(dx*dx + dy*dy);
      if (d > radius) continue;
      let fall: f32 = 1.0;
      if (d > inner && radius > inner) fall = 1.0 - (d - inner) / (radius - inner);
      const sa = (a as f32)/255.0 * fall * flow;
      if (sa <= 0) continue;
      const o = px(ptr, y*w + x);
      const da = (load<u8>(o+3) as f32)/255.0;
      const outA = sa + da*(1-sa);
      if (outA <= 0) continue;
      store<u8>(o,   ((((r as f32)*sa + (load<u8>(o)   as f32)*da*(1-sa))/outA)) as u8);
      store<u8>(o+1, ((((g as f32)*sa + (load<u8>(o+1) as f32)*da*(1-sa))/outA)) as u8);
      store<u8>(o+2, ((((b as f32)*sa + (load<u8>(o+2) as f32)*da*(1-sa))/outA)) as u8);
      store<u8>(o+3, (outA*255.0) as u8);
    }
  }
}

// ---- halftone: classic manga dot screen by local coverage of existing alpha ----
export function halftone(ptr:i32, w:i32, h:i32, cell:i32, angleDeg:f32, r:i32,g:i32,b:i32): void {
  const rad = angleDeg * (Mathf.PI / 180.0);
  const cs = Mathf.cos(rad), sn = Mathf.sin(rad);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = px(ptr, y*w + x);
      const cov = (load<u8>(o+3) as f32)/255.0;
      const rx = (x as f32)*cs - (y as f32)*sn;
      const ry = (x as f32)*sn + (y as f32)*cs;
      const fx = (rx - Mathf.floor(rx / (cell as f32)) * (cell as f32)) - (cell as f32)/2.0;
      const fy = (ry - Mathf.floor(ry / (cell as f32)) * (cell as f32)) - (cell as f32)/2.0;
      const dist = Mathf.sqrt(fx*fx + fy*fy);
      const dotR = (cell as f32)/2.0 * Mathf.sqrt(cov);
      if (dist <= dotR) { store<u8>(o, r as u8); store<u8>(o+1, g as u8); store<u8>(o+2, b as u8); store<u8>(o+3, 255); }
      else { store<u8>(o+3, 0); }
    }
  }
}

// ---- transformResample: affine inverse-map with bilinear sampling ----
export function transformResample(src:i32, sw:i32, sh:i32, dst:i32, dw:i32, dh:i32, m00:f32,m01:f32,m10:f32,m11:f32,tx:f32,ty:f32): void {
  const det = m00*m11 - m01*m10; if (det == 0) return;
  const i00 =  m11/det, i01 = -m01/det, i10 = -m10/det, i11 = m00/det;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const ox = (x as f32) - tx, oy = (y as f32) - ty;
      const sx = i00*ox + i01*oy, sy = i10*ox + i11*oy;
      const o = px(dst, y*dw + x);
      if (sx < 0 || sy < 0 || sx >= (sw as f32) || sy >= (sh as f32)) { store<u8>(o+3,0); continue; }
      const x0 = sx as i32, y0 = sy as i32; const x1 = min(x0+1, sw-1), y1 = min(y0+1, sh-1);
      const fx = sx - (x0 as f32), fy = sy - (y0 as f32);
      for (let c = 0; c < 4; c++) {
        const p00 = load<u8>(px(src, y0*sw+x0)+c) as f32, p10 = load<u8>(px(src, y0*sw+x1)+c) as f32;
        const p01 = load<u8>(px(src, y1*sw+x0)+c) as f32, p11 = load<u8>(px(src, y1*sw+x1)+c) as f32;
        const top = p00 + (p10-p00)*fx, bot = p01 + (p11-p01)*fx;
        store<u8>(o+c, (top + (bot-top)*fy) as u8);
      }
    }
  }
}
