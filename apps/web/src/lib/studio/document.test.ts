import { describe, it, expect } from 'vitest';
import { createDocument, addLayer, removeLayer, reorderLayer } from './document';

describe('document model', () => {
  it('creates a doc with one raster layer active', () => {
    const d = createDocument({ width: 800, height: 1200 });
    expect(d.width).toBe(800); expect(d.layers).toHaveLength(1);
    expect(d.activeLayerId).toBe(d.layers[0].id);
  });
  it('adds a layer on top and makes it active', () => {
    let d = createDocument({ width: 10, height: 10 });
    const first = d.layers[0].id;
    d = addLayer(d, 'raster', 'Ink');
    expect(d.layers).toHaveLength(2);
    expect(d.layers[1].name).toBe('Ink');
    expect(d.activeLayerId).toBe(d.layers[1].id);
    expect(d.layers[0].id).toBe(first);
  });
  it('reorders a layer (move index 0 -> top)', () => {
    let d = createDocument({ width: 10, height: 10 });
    d = addLayer(d, 'raster', 'B');
    const bottomId = d.layers[0].id;
    d = reorderLayer(d, bottomId, 1);
    expect(d.layers[1].id).toBe(bottomId);
  });
  it('removing the active layer reassigns active', () => {
    let d = createDocument({ width: 10, height: 10 });
    d = addLayer(d, 'raster', 'B');
    d = removeLayer(d, d.activeLayerId!);
    expect(d.layers).toHaveLength(1);
    expect(d.activeLayerId).toBe(d.layers[0].id);
  });
});
