import { describe, it, expect } from 'vitest';
import { paintGradient } from './fill';

describe('paintGradient', () => {
  it('linear black->white left to right', () => {
    const w = 10, h = 1;
    const buf = new Uint8ClampedArray(w * h * 4);
    paintGradient(buf, w, h, 'linear', { r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }, { x: 0, y: 0 }, { x: 9, y: 0 });
    expect(buf[0]).toBeLessThan(30); // left ~ black
    expect(buf[(9) * 4]).toBeGreaterThan(225); // right ~ white
  });
});
