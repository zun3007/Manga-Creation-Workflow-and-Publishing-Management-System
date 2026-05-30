import { describe, it, expect } from 'vitest';
import { fitContain, cropBuffer, buildManifest } from './io';
import { createDocument } from './document';

describe('io helpers', () => {
  it('fitContain centers a square inside a wide box', () => {
    const r = fitContain(100, 100, 200, 100);
    expect(r.dw).toBeCloseTo(100); expect(r.dh).toBeCloseTo(100); expect(r.dx).toBeCloseTo(50); expect(r.dy).toBeCloseTo(0);
  });
  it('cropBuffer copies the requested region', () => {
    const w=3,h=1; const buf=new Uint8ClampedArray(w*h*4); buf.set([1,1,1,255, 2,2,2,255, 3,3,3,255]);
    const c = cropBuffer(buf, w, h, 1, 0, 2, 1);
    expect(c.w).toBe(2); expect(c.buf[0]).toBe(2); expect(c.buf[4]).toBe(3);
  });
  it('buildManifest produces version 1 with empty layerImages', () => {
    const m = buildManifest(createDocument({ width:10, height:10 }));
    expect(m.version).toBe(1); expect(m.layerImages).toEqual({}); expect(m.doc.width).toBe(10);
  });
});
