import { describe, it, expect } from 'vitest';
import { composeAffine, applyAffine } from './transform';

describe('affine', () => {
  it('identity', () => { expect(composeAffine({})).toEqual([1,0,0,1,0,0]); });
  it('translate', () => { expect(composeAffine({ tx:5, ty:-3 })).toEqual([1,0,0,1,5,-3]); });
  it('rotate 90deg maps (1,0)->(0,1)', () => {
    const m = composeAffine({ rotation: Math.PI/2 });
    const p = applyAffine(m, 1, 0);
    expect(p.x).toBeCloseTo(0); expect(p.y).toBeCloseTo(1);
  });
  it('scale about an origin keeps the origin fixed', () => {
    const m = composeAffine({ scaleX:2, scaleY:2, originX:10, originY:10 });
    const p = applyAffine(m, 10, 10);
    expect(p.x).toBeCloseTo(10); expect(p.y).toBeCloseTo(10);
  });
});
