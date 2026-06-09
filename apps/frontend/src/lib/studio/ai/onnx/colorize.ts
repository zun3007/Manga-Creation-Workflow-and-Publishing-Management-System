// Pure color conversion helpers: RGBA ↔ CHW 256×256

/**
 * Convert RGBA document (arbitrary size) to CHW 256×256 float32, using nearest-neighbor stretch.
 * - Input: RGBA uint8 array, original dimensions w×h (RGBA interleaved, alpha ignored)
 * - Output: Float32Array [3*256*256], values 0-255, layout: [R plane, G plane, B plane] (CHW)
 */
export function rgbaToChw256(
  rgba: Uint8ClampedArray,
  w: number,
  h: number
): Float32Array {
  const target = 256;
  const out = new Float32Array(3 * target * target);

  // Nearest-neighbor stretch from (w, h) to (256, 256)
  for (let ty = 0; ty < target; ty++) {
    for (let tx = 0; tx < target; tx++) {
      // Sample from original, nearest-neighbor
      const sx = Math.floor((tx * w) / target);
      const sy = Math.floor((ty * h) / target);
      const srcIdx = (sy * w + sx) * 4; // RGBA offset in source

      const r = rgba[srcIdx];
      const g = rgba[srcIdx + 1];
      const b = rgba[srcIdx + 2];

      // Write to CHW: R plane, then G plane, then B plane
      const dstIdx = ty * target + tx;
      out[dstIdx] = r; // R plane
      out[target * target + dstIdx] = g; // G plane
      out[2 * target * target + dstIdx] = b; // B plane
    }
  }

  return out;
}

/**
 * Convert CHW 256×256 float32 output back to RGBA document (arbitrary size).
 * - Input: Float32Array [3*256*256], values 0-255, layout CHW
 * - Output: RGBA uint8 array, resized to (dw, dh), alpha channel = 255
 */
export function chw256ToRgba(
  chw256: Float32Array,
  dw: number,
  dh: number
): Uint8ClampedArray {
  const target = 256;
  const out = new Uint8ClampedArray(dw * dh * 4);

  // Nearest-neighbor resize from 256×256 back to (dw, dh)
  for (let dy = 0; dy < dh; dy++) {
    for (let dx = 0; dx < dw; dx++) {
      // Sample from CHW, nearest-neighbor
      const sx = Math.floor((dx * target) / dw);
      const sy = Math.floor((dy * target) / dh);
      const srcIdx = sy * target + sx;

      const r = Math.max(0, Math.min(255, Math.round(chw256[srcIdx])));
      const g = Math.max(0, Math.min(255, Math.round(chw256[target * target + srcIdx])));
      const b = Math.max(0, Math.min(255, Math.round(chw256[2 * target * target + srcIdx])));

      const dstIdx = (dy * dw + dx) * 4;
      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = 255; // Alpha always opaque
    }
  }

  return out;
}
