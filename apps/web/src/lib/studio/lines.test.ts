import { describe, it, expect } from 'vitest';
import { radialLines, parallelLines } from './lines';

describe('line generators', () => {
  it('radialLines emits N segments from the center', () => {
    const segs = radialLines(50, 50, 12, 100);
    expect(segs).toHaveLength(12);
    for (const s of segs) {
      expect(s.x0).toBe(50);
      expect(s.y0).toBe(50);
    }
  });

  it('parallelLines emits N segments', () => {
    expect(parallelLines(30, 8, 10, 100, 100)).toHaveLength(8);
  });
});
