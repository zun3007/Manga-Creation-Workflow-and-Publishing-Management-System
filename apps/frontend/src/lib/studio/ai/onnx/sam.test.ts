import { it, expect } from 'vitest';
import { pointToSamCoords, maskToSelection, hwcLetterbox, maskToSelectionCropped } from './sam';
it('scales a doc point into 1024-space SAM coords', () => {
  const c = pointToSamCoords({ x: 100, y: 100 }, 200, 100, 1024);
  expect(c.x).toBeCloseTo(512); expect(c.y).toBeCloseTo(512);
});
it('maskToSelection thresholds a low-res mask and resizes to doc size (255/0)', () => {
  const low = new Float32Array(4); low.set([ -1, 2, 2, -1 ]); // 2x2, >0 selected
  const sel = maskToSelection(low, 2, 2, 4, 2);  // → 4x2 doc
  expect(sel.length).toBe(4*2); expect(sel[ (0*4+2) ]).toBe(255); expect(sel[0]).toBe(0);
});
it('hwcLetterbox makes a target×target×3 buffer, top-left placed, 0-255', () => {
  const rgba = new Uint8ClampedArray([10,20,30,255, 40,50,60,255]); // 2x1
  const { data, sw, sh, scale } = hwcLetterbox(rgba, 2, 1, 4);
  expect(data.length).toBe(4*4*3); expect(scale).toBeCloseTo(2); expect(sw).toBe(4); expect(sh).toBe(2);
  expect([data[0],data[1],data[2]]).toEqual([10,20,30]);   // top-left content
  expect(data[(3*4+3)*3]).toBe(0);                          // bottom-right padding
});
it('maskToSelectionCropped maps only the content region (crops padding)', () => {
  const m = new Float32Array(16).fill(-1); m[0]=1; m[1]=1; m[4]=1; m[5]=1; // top-left 2x2 of a 4x4 mask >0
  const sel = maskToSelectionCropped(m, 4, 4, 2, 2, 4, 2, 2); // content sw=sh=2 in target=4 → doc 2x2
  expect(sel.length).toBe(4); expect(sel[0]).toBe(255);
});
