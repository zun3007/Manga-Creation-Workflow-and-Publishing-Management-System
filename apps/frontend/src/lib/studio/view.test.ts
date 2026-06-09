import { describe, it, expect } from 'vitest';
import { screenToDoc, makeView } from './view';

describe('view transform', () => {
  it('round-trips center with zoom and pan', () => {
    const v = makeView({ zoom: 2, panX: 10, panY: 20, rotation: 0 });
    const p = screenToDoc(v, { x: 10 + 2 * 50, y: 20 + 2 * 60 });
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(60);
  });

  it('handles zoom-only mapping', () => {
    const v = makeView({ zoom: 0.5, panX: 0, panY: 0, rotation: 0 });
    const p = screenToDoc(v, { x: 100, y: 50 });
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(100);
  });
});
