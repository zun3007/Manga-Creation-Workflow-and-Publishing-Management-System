export function pointToSamCoords(p: { x:number;y:number }, w:number, h:number, target=1024) {
  const s = target / Math.max(w, h); return { x: p.x * s, y: p.y * s };
}
/** nearest-neighbor resize a low-res logit mask (lw×lh) to doc (dw×dh); >0 → 255 else 0. */
export function maskToSelection(low: Float32Array, lw:number, lh:number, dw:number, dh:number): Uint8Array {
  const out = new Uint8Array(dw*dh);
  for (let y=0;y<dh;y++) for (let x=0;x<dw;x++) {
    const lx = Math.min(lw-1, Math.floor(x*lw/dw)), ly = Math.min(lh-1, Math.floor(y*lh/dh));
    out[y*dw+x] = low[ly*lw+lx] > 0 ? 255 : 0;
  }
  return out;
}
