import { describe, it, expect } from 'vitest';
import { rgbaToChw256, chw256ToRgba } from './colorize';

describe('rgbaToChw256', () => {
  it('returns Float32Array of length 3*256*256', () => {
    const w = 512, h = 512;
    const rgba = new Uint8ClampedArray(w * h * 4);
    const out = rgbaToChw256(rgba, w, h);
    expect(out).toBeInstanceOf(Float32Array);
    expect(out.length).toBe(3 * 256 * 256);
  });

  it('produces values in range [0, 255]', () => {
    const w = 64, h = 64;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 200; // R
      rgba[i + 1] = 150; // G
      rgba[i + 2] = 100; // B
      rgba[i + 3] = 255; // A (ignored)
    }
    const out = rgbaToChw256(rgba, w, h);
    let max = 0, min = 255;
    for (let i = 0; i < out.length; i++) {
      max = Math.max(max, out[i]);
      min = Math.min(min, out[i]);
    }
    expect(max).toBeLessThanOrEqual(255);
    expect(min).toBeGreaterThanOrEqual(0);
  });

  it('stretches a small image to 256×256 nearest-neighbor', () => {
    const w = 2, h = 2;
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255,       // red
      0, 255, 0, 255,       // green
      0, 0, 255, 255,       // blue
      128, 128, 128, 255,   // gray
    ]);
    const out = rgbaToChw256(rgba, w, h);

    // Check that the R, G, B planes have the expected values somewhere
    const rPlane = out.slice(0, 256 * 256);
    const gPlane = out.slice(256 * 256, 2 * 256 * 256);
    const bPlane = out.slice(2 * 256 * 256, 3 * 256 * 256);

    // The first quadrant (red) should have high R values
    expect(rPlane[0]).toBeGreaterThan(100);
    expect(gPlane[0]).toBeLessThan(50);
    expect(bPlane[0]).toBeLessThan(50);
  });
});

describe('chw256ToRgba', () => {
  it('returns Uint8ClampedArray of length dw*dh*4', () => {
    const chw = new Float32Array(3 * 256 * 256);
    const dw = 128, dh = 128;
    const out = chw256ToRgba(chw, dw, dh);
    expect(out).toBeInstanceOf(Uint8ClampedArray);
    expect(out.length).toBe(dw * dh * 4);
  });

  it('sets alpha channel to 255', () => {
    const chw = new Float32Array(3 * 256 * 256);
    const dw = 64, dh = 64;
    const out = chw256ToRgba(chw, dw, dh);
    for (let i = 3; i < out.length; i += 4) {
      expect(out[i]).toBe(255);
    }
  });

  it('round-trips color values with nearest-neighbor clamp', () => {
    const chw = new Float32Array(3 * 256 * 256);
    const dw = 256, dh = 256;

    // Set a known color: R=200, G=150, B=100 in the first pixel of each plane
    chw[0] = 200; // R plane [0]
    chw[256 * 256] = 150; // G plane [0]
    chw[2 * 256 * 256] = 100; // B plane [0]

    const out = chw256ToRgba(chw, dw, dh);
    expect(out[0]).toBe(200); // R
    expect(out[1]).toBe(150); // G
    expect(out[2]).toBe(100); // B
    expect(out[3]).toBe(255); // A
  });

  it('clamps values outside [0, 255]', () => {
    const chw = new Float32Array(3 * 256 * 256);
    chw[0] = 300; // Over 255
    chw[256 * 256] = -10; // Under 0
    chw[2 * 256 * 256] = 128;

    const out = chw256ToRgba(chw, 256, 256);
    expect(out[0]).toBe(255); // Clamped to 255
    expect(out[1]).toBe(0); // Clamped to 0
    expect(out[2]).toBe(128);
  });
});
