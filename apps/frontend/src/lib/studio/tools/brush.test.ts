import { describe, it, expect } from 'vitest';
import { interpolateStamps, pressureSize, pressureOpacity } from './brush';

describe('brush stroke math', () => {
  it('interpolates evenly spaced stamps along a segment', () => {
    const pts = interpolateStamps({ x: 0, y: 0 }, { x: 10, y: 0 }, 2);
    expect(pts.length).toBe(5);
    expect(pts[0].x).toBeCloseTo(2);
    expect(pts[4].x).toBeCloseTo(10);
  });
  it('pressure scales size when enabled, else constant', () => {
    expect(pressureSize(10, 1, true)).toBeCloseTo(10);
    expect(pressureSize(10, 0, true)).toBeCloseTo(2.5);
    expect(pressureSize(10, 0.2, false)).toBe(10);
  });
  it('pressure scales opacity when enabled', () => {
    expect(pressureOpacity(1, 0.5, true)).toBeCloseTo(0.5);
    expect(pressureOpacity(1, 0.5, false)).toBe(1);
  });
});
