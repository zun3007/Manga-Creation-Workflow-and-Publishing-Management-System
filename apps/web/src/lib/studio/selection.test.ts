import { describe, it, expect } from 'vitest';
import { rectMask, ellipseMask, pointInPolygon, wandMask, lassoMask } from './selection';

describe('selection masks', () => {
  it('rectMask marks inside pixels', () => {
    const m = rectMask(4, 4, 1, 1, 2, 2);
    expect(m[1*4+1]).toBe(255); expect(m[0]).toBe(0);
  });
  it('ellipseMask marks the center', () => {
    const m = ellipseMask(9, 9, 0, 0, 8, 8);
    expect(m[4*9+4]).toBe(255); expect(m[0]).toBe(0);
  });
  it('pointInPolygon for a square', () => {
    const sq = [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
    expect(pointInPolygon(5,5,sq)).toBe(true); expect(pointInPolygon(15,5,sq)).toBe(false);
  });
  it('lassoMask selects a polygonal area', () => {
    const poly = [{x:1,y:1},{x:3,y:1},{x:3,y:3},{x:1,y:3}];
    const m = lassoMask(5, 5, poly);
    expect(m[2*5+2]).toBe(255); expect(m[0]).toBe(0);
  });
  it('wandMask selects a connected same-color region', () => {
    const w=3,h=1; const buf=new Uint8ClampedArray(w*h*4);
    buf.set([255,0,0,255, 255,0,0,255, 0,0,0,255]);
    const m = wandMask(buf, w, h, 0, 0, 10);
    expect(m[0]).toBe(255); expect(m[1]).toBe(255); expect(m[2]).toBe(0);
  });
  it('wandMask uses 8-connected flood fill to include diagonals', () => {
    const w=3, h=3; const buf=new Uint8ClampedArray(w*h*4);
    // Create a pattern where pixels touch diagonally:
    // R R .
    // . R .
    // . . .
    buf.set([255,0,0,255, 255,0,0,255, 0,0,0,255,  // row 0
             0,0,0,255, 255,0,0,255, 0,0,0,255,     // row 1
             0,0,0,255, 0,0,0,255, 0,0,0,255]);     // row 2
    const m = wandMask(buf, w, h, 0, 0, 10);
    // Should select (0,0), (1,0) directly adjacent, and (1,1) diagonal
    expect(m[0*3+0]).toBe(255); // (0,0)
    expect(m[0*3+1]).toBe(255); // (1,0)
    expect(m[1*3+1]).toBe(255); // (1,1) - diagonal connection
    expect(m[1*3+0]).toBe(0);   // (0,1) - no diagonal neighbor that's red
  });
});
