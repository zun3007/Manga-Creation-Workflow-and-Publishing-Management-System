import type { DocumentData, LayerData, LayerKind, BlendMode } from './types';

let _id = 0;
// deterministic-ish id (Math.random unavailable in some sandboxes; use counter + time-free)
export function newId(prefix = 'l'): string { _id += 1; return `${prefix}_${_id.toString(36)}`; }

export function makeLayer(kind: LayerKind, name: string): LayerData {
  return { id: newId(), name, kind, visible: true, opacity: 1, blendMode: 'normal' as BlendMode,
    locked: false, alphaLocked: false, clipped: false, parentId: null };
}

export function createDocument(opts: { width:number; height:number; dpi?:number; background?:'transparent'|'white' }): DocumentData {
  const base = makeLayer('raster', 'Layer 1');
  return { id: newId('doc'), width: opts.width, height: opts.height, dpi: opts.dpi ?? 350,
    background: opts.background ?? 'white', layers: [base], activeLayerId: base.id };
}

export function addLayer(d: DocumentData, kind: LayerKind, name?: string): DocumentData {
  const layer = makeLayer(kind, name ?? `Layer ${d.layers.length + 1}`);
  return { ...d, layers: [...d.layers, layer], activeLayerId: layer.id };
}

export function removeLayer(d: DocumentData, id: string): DocumentData {
  if (d.layers.length <= 1) return d; // keep at least one
  const layers = d.layers.filter(l => l.id !== id);
  const activeLayerId = d.activeLayerId === id ? layers[layers.length - 1].id : d.activeLayerId;
  return { ...d, layers, activeLayerId };
}

export function reorderLayer(d: DocumentData, id: string, toIndex: number): DocumentData {
  const from = d.layers.findIndex(l => l.id === id);
  if (from < 0) return d;
  const layers = d.layers.slice();
  const [moved] = layers.splice(from, 1);
  layers.splice(Math.max(0, Math.min(toIndex, layers.length)), 0, moved);
  return { ...d, layers };
}

export function setActive(d: DocumentData, id: string): DocumentData {
  return d.layers.some(l => l.id === id) ? { ...d, activeLayerId: id } : d;
}

export function updateLayer(d: DocumentData, id: string, patch: Partial<LayerData>): DocumentData {
  return { ...d, layers: d.layers.map(l => l.id === id ? { ...l, ...patch } : l) };
}
