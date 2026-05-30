import { it, expect } from 'vitest';
import { pointToSamCoords, maskToSelection } from './sam';
it('scales a doc point into 1024-space SAM coords', () => {
  const c = pointToSamCoords({ x: 100, y: 100 }, 200, 100, 1024);
  expect(c.x).toBeCloseTo(512); expect(c.y).toBeCloseTo(512);
});
it('maskToSelection thresholds a low-res mask and resizes to doc size (255/0)', () => {
  const low = new Float32Array(4); low.set([ -1, 2, 2, -1 ]); // 2x2, >0 selected
  const sel = maskToSelection(low, 2, 2, 4, 2);  // → 4x2 doc
  expect(sel.length).toBe(4*2); expect(sel[ (0*4+2) ]).toBe(255); expect(sel[0]).toBe(0);
});
