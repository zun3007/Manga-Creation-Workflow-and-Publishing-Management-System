import { describe, it, expect } from 'vitest';
import { rgbaToNchwLetterboxed } from './image';

describe('image prep', () => {
  it('produces a normalized NCHW tensor of the target size', () => {
    const w = 2, h = 2;
    const px = new Uint8ClampedArray([
      255, 0, 0, 255,       // red, opaque
      0, 255, 0, 255,       // green, opaque
      0, 0, 255, 255,       // blue, opaque
      255, 255, 255, 255,   // white, opaque
    ]);
    const { data } = rgbaToNchwLetterboxed(px, w, h, 4);
    expect(data.length).toBe(3 * 4 * 4);
    expect(Math.max(...data)).toBeLessThanOrEqual(1);
    expect(Math.min(...data)).toBeGreaterThanOrEqual(0);
  });
});
