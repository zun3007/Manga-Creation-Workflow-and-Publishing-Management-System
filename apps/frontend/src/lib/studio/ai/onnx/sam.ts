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

/**
 * Letterbox an RGBA image into a target×target HWC float buffer (0-255), TOP-LEFT placement
 * (pad right/bottom with 0). Matches the samexporter MobileSAM encoder input `input_image`
 * of shape [target,target,3] (it normalizes internally). Returns the scaled content size.
 */
export function hwcLetterbox(rgba: Uint8ClampedArray, w: number, h: number, target: number): { data: Float32Array; scale: number; sw: number; sh: number } {
  const scale = target / Math.max(w, h);
  const sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale));
  const data = new Float32Array(target * target * 3); // zero-padded
  for (let y = 0; y < sh && y < target; y++) {
    const syi = Math.min(h - 1, Math.floor(y / scale));
    for (let x = 0; x < sw && x < target; x++) {
      const sxi = Math.min(w - 1, Math.floor(x / scale));
      const s = (syi * w + sxi) * 4, d = (y * target + x) * 3;
      data[d] = rgba[s]; data[d + 1] = rgba[s + 1]; data[d + 2] = rgba[s + 2];
    }
  }
  return { data, scale, sw, sh };
}

/**
 * Map a SAM logit mask (mlw×mlh, covering a TOP-LEFT letterboxed image whose content occupies
 * sw×sh within `target`) to a doc-sized selection (dw×dh); logit>0 → 255. Crops out the padding.
 */
export function maskToSelectionCropped(mask: Float32Array, mlw: number, mlh: number, sw: number, sh: number, target: number, dw: number, dh: number): Uint8Array {
  const out = new Uint8Array(dw * dh);
  const validW = sw * mlw / target, validH = sh * mlh / target; // content region within the mask
  for (let y = 0; y < dh; y++) {
    const my = Math.min(mlh - 1, Math.floor((y / dh) * validH));
    for (let x = 0; x < dw; x++) {
      const mx = Math.min(mlw - 1, Math.floor((x / dw) * validW));
      out[y * dw + x] = mask[my * mlw + mx] > 0 ? 255 : 0;
    }
  }
  return out;
}
