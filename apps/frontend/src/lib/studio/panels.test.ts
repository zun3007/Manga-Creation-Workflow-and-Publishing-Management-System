import { describe, it, expect } from 'vitest';
import { templateFrames, drawFrameBorders } from './panels';

describe('panel templates', () => {
  it('2x2 yields 4 normalized frames inside the canvas', () => {
    const f = templateFrames('2x2', 0.02);
    expect(f).toHaveLength(4);
    for (const r of f) { expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(1.0001); }
  });
  it('4koma yields 4 stacked rows', () => { expect(templateFrames('4koma')).toHaveLength(4); });
  it('drawFrameBorders paints black on a frame edge', () => {
    const w=20,h=20; const buf=new Uint8ClampedArray(w*h*4);
    drawFrameBorders(buf, w, h, [{ x:0.1, y:0.1, width:0.5, height:0.5 }], 2);
    const ex = Math.round(0.1*w), ey = Math.round(0.1*h); const o=(ey*w+ex)*4;
    expect(buf[o+3]).toBe(255); expect(buf[o]).toBe(0);
  });
});
