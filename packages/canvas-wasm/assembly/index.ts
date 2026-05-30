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
