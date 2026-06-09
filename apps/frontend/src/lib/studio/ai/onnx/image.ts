import { letterbox, type Letterbox } from './yolo';

export function rgbaToNchwLetterboxed(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  target: number
): { data: Float32Array; lb: Letterbox } {
  const lb = letterbox(w, h, target);
  const data = new Float32Array(3 * target * target); // zero-padded

  const sw = Math.round(w * lb.scale);
  const sh = Math.round(h * lb.scale);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      // nearest-neighbor sample from original image
      const sx = Math.min(w - 1, Math.floor(x / lb.scale));
      const sy = Math.min(h - 1, Math.floor(y / lb.scale));
      const o = (sy * w + sx) * 4; // RGBA offset

      // place in letterboxed position
      const dx = x + Math.round(lb.padX);
      const dy = y + Math.round(lb.padY);

      if (dx < 0 || dy < 0 || dx >= target || dy >= target) continue;

      const p = dy * target + dx; // linear index in target space
      // normalize RGB to [0,1] and write to NCHW layout
      data[p] = px[o] / 255; // R channel
      data[target * target + p] = px[o + 1] / 255; // G channel
      data[2 * target * target + p] = px[o + 2] / 255; // B channel
    }
  }

  return { data, lb };
}
