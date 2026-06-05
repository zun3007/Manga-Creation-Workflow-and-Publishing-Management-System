import type { DocumentData, LayerData, RGBA, BlendMode } from './types';
import { BLEND_INT } from './types';
import { History, type Op } from './history';
import { addLayer, removeLayer, reorderLayer, setActive, updateLayer } from './document';
import type { InkforgeWasm } from '@manga/canvas-wasm';

export class StudioEngine {
  doc: DocumentData;
  wasm: InkforgeWasm;
  history: History;
  selectionMask: Uint8Array | null;
  symmetry: 'none'|'vertical'|'horizontal';
  private buffers: Map<string, Uint8ClampedArray>;
  private listeners: Set<() => void>;
  private revision: number;
  private savedRevision: number;

  constructor(doc: DocumentData, wasm: InkforgeWasm) {
    this.doc = doc;
    this.wasm = wasm;
    this.history = new History(40);
    this.selectionMask = null;
    this.symmetry = 'none';
    this.buffers = new Map();
    this.listeners = new Set();
    this.revision = 0;
    this.savedRevision = 0;
    for (const l of doc.layers) this.ensureBuffer(l.id);
  }

  private get N() { return this.doc.width * this.doc.height * 4; }

  ensureBuffer(id: string): Uint8ClampedArray {
    let b = this.buffers.get(id);
    if (!b) { b = new Uint8ClampedArray(this.N); this.buffers.set(id, b); }
    return b;
  }

  getBuffer(id: string) { return this.ensureBuffer(id); }

  setBuffer(id: string, buf: Uint8ClampedArray) { this.buffers.set(id, buf); }

  onChange(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  private emit() { for (const fn of this.listeners) fn(); }

  /** Composite all visible layers (bottom→top) into a single RGBA buffer. */
  composite(): Uint8ClampedArray {
    const { width: w, height: h } = this.doc;
    const out = new Uint8ClampedArray(this.N);
    if (this.doc.background === 'white') out.fill(255);
    let prevAlpha: Uint8ClampedArray | null = null;
    for (const l of this.doc.layers) {
      if (!l.visible || l.opacity <= 0) continue;
      let src = this.ensureBuffer(l.id);
      if (l.clipped && prevAlpha) src = this.maskAlpha(src, prevAlpha);
      this.wasm.composite(out, src, w, h, l.opacity, BLEND_INT[l.blendMode]);
      prevAlpha = src;
    }
    return out;
  }

  private maskAlpha(src: Uint8ClampedArray, mask: Uint8ClampedArray): Uint8ClampedArray {
    const r = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      r[i] = src[i]; r[i+1] = src[i+1]; r[i+2] = src[i+2];
      r[i+3] = (src[i+3] * (mask[i+3] / 255)) | 0;
    }
    return r;
  }

  // ---- layer mutations (mirror document.ts, keep buffers in sync) ----
  private _addLayer(kind: LayerData['kind'], name?: string) {
    this.doc = addLayer(this.doc, kind, name);
    this.ensureBuffer(this.doc.activeLayerId!);
  }

  addLayer(kind: LayerData['kind'], name?: string) {
    const before = this.doc;
    this._addLayer(kind, name);
    const newLayerId = this.doc.activeLayerId!;
    const after = this.doc;
    this.history.push({
      label: 'Add layer',
      undo: () => { this.doc = before; this.buffers.delete(newLayerId); this.revision++; this.emit(); },
      redo: () => { this.doc = after; this.ensureBuffer(newLayerId); this.revision++; this.emit(); },
    } as Op);
    this.revision++; this.emit();
  }

  private _removeLayer(id: string) {
    this.doc = removeLayer(this.doc, id);
    this.buffers.delete(id);
  }

  removeLayer(id: string) {
    const before = this.doc;
    const buf = this.getBuffer(id).slice();
    this._removeLayer(id);
    const after = this.doc;
    this.history.push({
      label: 'Remove layer',
      undo: () => { this.doc = before; this.setBuffer(id, buf); this.revision++; this.emit(); },
      redo: () => { this.doc = after; this.buffers.delete(id); this.revision++; this.emit(); },
    } as Op);
    this.revision++; this.emit();
  }

  private _reorderLayer(id: string, to: number) {
    this.doc = reorderLayer(this.doc, id, to);
  }

  reorderLayer(id: string, to: number) {
    const before = this.doc;
    this._reorderLayer(id, to);
    const after = this.doc;
    this.history.push({
      label: 'Reorder layer',
      undo: () => { this.doc = before; this.revision++; this.emit(); },
      redo: () => { this.doc = after; this.revision++; this.emit(); },
    } as Op);
    this.revision++; this.emit();
  }

  private _setActiveLayer(id: string) {
    this.doc = setActive(this.doc, id);
  }

  setActiveLayer(id: string) {
    const before = this.doc;
    this._setActiveLayer(id);
    const after = this.doc;
    this.history.push({
      label: 'Set active layer',
      undo: () => { this.doc = before; this.revision++; this.emit(); },
      redo: () => { this.doc = after; this.revision++; this.emit(); },
    } as Op);
    this.revision++; this.emit();
  }

  setLayerVisible(id: string, v: boolean) { this.doc = updateLayer(this.doc, id, { visible: v }); this.revision++; this.emit(); }

  setLayerOpacity(id: string, o: number) { this.doc = updateLayer(this.doc, id, { opacity: o }); this.revision++; this.emit(); }

  setLayerBlend(id: string, b: BlendMode) { this.doc = updateLayer(this.doc, id, { blendMode: b }); this.revision++; this.emit(); }

  setLayerLocked(id: string, v: boolean) { this.doc = updateLayer(this.doc, id, { locked: v }); this.revision++; this.emit(); }

  setLayerClipped(id: string, v: boolean) { this.doc = updateLayer(this.doc, id, { clipped: v }); this.revision++; this.emit(); }

  renameLayer(id: string, name: string) { this.doc = updateLayer(this.doc, id, { name }); this.revision++; this.emit(); }

  setLayerText(id: string, text: import('./types').TextData) { this.doc = updateLayer(this.doc, id, { text }); this.revision++; this.emit(); }

  duplicateLayer(id: string) {
    const before = { doc: this.doc, newLayerId: null as string | null, buffers: new Map<string, Uint8ClampedArray>() };
    const i = this.doc.layers.findIndex(l => l.id === id); if (i < 0) return;
    const src = this.doc.layers[i];
    for (const l of this.doc.layers) before.buffers.set(l.id, this.ensureBuffer(l.id).slice());
    this._addLayer(src.kind, `${src.name} copy`);
    const nid = this.doc.activeLayerId!; before.newLayerId = nid;
    this.ensureBuffer(nid).set(this.ensureBuffer(id));
    this._reorderLayer(nid, i + 1);
    const afterDoc = this.doc;
    const afterBuffers = new Map(this.doc.layers.map(l => [l.id, this.ensureBuffer(l.id).slice()]));
    this.history.push({
      label: 'Duplicate layer',
      undo: () => { this.doc = before.doc; this.buffers.clear(); for (const [id, buf] of before.buffers) this.setBuffer(id, buf); this.revision++; this.emit(); },
      redo: () => { this.doc = afterDoc; this.buffers.clear(); for (const [id, buf] of afterBuffers) this.setBuffer(id, buf); this.revision++; this.emit(); },
    } as Op);
    this.revision++;
  }

  mergeDown(id: string) {
    const i = this.doc.layers.findIndex(l => l.id === id); if (i <= 0) return;
    const before = {
      doc: this.doc,
      topBufferId: id,
      topBuffer: this.ensureBuffer(id).slice(),
      belowBufferId: this.doc.layers[i - 1].id,
      belowBuffer: this.ensureBuffer(this.doc.layers[i - 1].id).slice(),
    };
    const top = this.doc.layers[i], below = this.doc.layers[i - 1];
    const base = before.belowBuffer.slice();
    this.wasm.composite(base, before.topBuffer, this.doc.width, this.doc.height, top.opacity, BLEND_INT[top.blendMode]);
    this.ensureBuffer(below.id).set(base);
    this._removeLayer(id);
    const afterDoc = this.doc;
    const afterBuf = base.slice();
    this.history.push({
      label: 'Merge down',
      undo: () => { this.doc = before.doc; this.setBuffer(before.topBufferId, before.topBuffer); this.setBuffer(before.belowBufferId, before.belowBuffer); this.revision++; this.emit(); },
      redo: () => { this.doc = afterDoc; this.setBuffer(before.belowBufferId, afterBuf); this.revision++; this.emit(); },
    } as Op);
    this.revision++;
  }

  flattenImage() {
    const keepId = this.doc.layers[0].id;
    const before = {
      doc: this.doc,
      buffers: new Map(this.doc.layers.map(l => [l.id, this.ensureBuffer(l.id).slice()])),
    };
    const out = this.composite();
    for (const lid of this.doc.layers.slice(1).map(l => l.id)) this._removeLayer(lid);
    this.doc = updateLayer(this.doc, keepId, { opacity: 1, blendMode: 'normal', visible: true, clipped: false });
    this.ensureBuffer(keepId).set(out);
    const afterDoc = this.doc;
    const afterOut = out.slice();
    this.history.push({
      label: 'Flatten image',
      undo: () => { this.doc = before.doc; this.buffers.clear(); for (const [id, buf] of before.buffers) this.setBuffer(id, buf); this.revision++; this.emit(); },
      redo: () => { this.doc = afterDoc; this.setBuffer(keepId, afterOut); this.revision++; this.emit(); },
    } as Op);
    this.revision++; this._setActiveLayer(keepId); this.emit();
  }

  // ---- selection & clipboard ----
  private clipboard: Uint8ClampedArray | null = null;

  copySelection() {
    const id = this.doc.activeLayerId; if (!id) return; const src = this.ensureBuffer(id);
    const out = new Uint8ClampedArray(src.length); const m = this.selectionMask;
    if (m) { for (let p = 0; p < m.length; p++) if (m[p]) { const o = p*4; out[o]=src[o]; out[o+1]=src[o+1]; out[o+2]=src[o+2]; out[o+3]=src[o+3]; } }
    else out.set(src);
    this.clipboard = out;
  }

  paste() {
    if (!this.clipboard) return;
    const before = this.doc;
    this._addLayer('raster', 'Pasted');
    const newLayerId = this.doc.activeLayerId!;
    this.ensureBuffer(newLayerId).set(this.clipboard);
    const afterDoc = this.doc;
    const clipboard = this.clipboard.slice();
    this.history.push({
      label: 'Paste',
      undo: () => { this.doc = before; this.buffers.delete(newLayerId); this.revision++; this.emit(); },
      redo: () => { this.doc = afterDoc; this.ensureBuffer(newLayerId).set(clipboard); this.revision++; this.emit(); },
    } as Op);
    this.revision++; this.emit();
  }

  invertSelection() { const m = this.selectionMask; if (!m) return; const inv = new Uint8Array(m.length); for (let p = 0; p < m.length; p++) inv[p] = m[p] ? 0 : 255; this.selectionMask = inv; this.emit(); }

  setSelection(mask: Uint8Array | null) { this.selectionMask = mask; this.emit(); }

  clearSelection() { this.selectionMask = null; this.emit(); }

  private activeWritable(): string | null {
    const id = this.doc.activeLayerId; if (!id) return null;
    const l = this.doc.layers.find(x => x.id === id);
    return l && !l.locked ? id : null;
  }

  private pushSwap(id: string, before: Uint8ClampedArray, label: string) {
    const after = this.ensureBuffer(id).slice();
    this.history.push({
      label,
      undo: () => { this.ensureBuffer(id).set(before); this.emit(); },
      redo: () => { this.ensureBuffer(id).set(after); this.emit(); },
    } as Op);
    this.revision++;
  }

  markSaved(): void {
    this.savedRevision = this.revision;
  }

  isDirty(): boolean {
    return this.revision !== this.savedRevision;
  }

  // ---- painting ----
  beginStroke(): Uint8ClampedArray | null { const id = this.activeWritable(); return id ? this.ensureBuffer(id).slice() : null; }

  stamp(cx:number, cy:number, radius:number, hardness:number, color:RGBA, flow:number) {
    const id = this.activeWritable(); if (!id) return;
    const buf = this.ensureBuffer(id); const w = this.doc.width, h = this.doc.height;
    this.wasm.brushStamp(buf, w, h, cx, cy, radius, hardness, color, flow);
    if (this.symmetry === 'vertical') this.wasm.brushStamp(buf, w, h, w - cx, cy, radius, hardness, color, flow);
    else if (this.symmetry === 'horizontal') this.wasm.brushStamp(buf, w, h, cx, h - cy, radius, hardness, color, flow);
  }

  /** Restore pixels outside the active selection from `before`, so an edit only affects the selection. */
  private restoreOutside(id: string, before: Uint8ClampedArray) {
    const m = this.selectionMask; if (!m) return;
    const buf = this.ensureBuffer(id);
    for (let p = 0; p < m.length; p++) if (m[p] === 0) { const o = p*4; buf[o]=before[o]; buf[o+1]=before[o+1]; buf[o+2]=before[o+2]; buf[o+3]=before[o+3]; }
  }

  commitStroke(before: Uint8ClampedArray | null, label = 'Stroke') {
    const id = this.doc.activeLayerId; if (!before || !id) return;
    this.restoreOutside(id, before);
    this.pushSwap(id, before, label); this.emit();
  }

  bucketFill(x:number, y:number, color:RGBA, tol:number) {
    const id = this.activeWritable(); if (!id) return;
    const before = this.ensureBuffer(id).slice();
    this.wasm.floodFill(this.ensureBuffer(id), this.doc.width, this.doc.height, Math.floor(x), Math.floor(y), color, tol);
    this.restoreOutside(id, before);
    this.pushSwap(id, before, 'Bucket fill'); this.emit();
  }

  // ---- live-stroke render trigger + TS eraser (destination-out soft dab) ----
  requestRender() { this.emit(); }

  erase(cx:number, cy:number, radius:number, hardness:number, flow:number) {
    const id = this.activeWritable(); if (!id) return;
    const buf = this.ensureBuffer(id); const w = this.doc.width, h = this.doc.height;
    const minx = Math.max(0, Math.floor(cx - radius)), maxx = Math.min(w - 1, Math.ceil(cx + radius));
    const miny = Math.max(0, Math.floor(cy - radius)), maxy = Math.min(h - 1, Math.ceil(cy + radius));
    const inner = radius * hardness;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy); if (d > radius) continue;
      let fall = 1; if (d > inner && radius > inner) fall = 1 - (d - inner) / (radius - inner);
      const o = (y * w + x) * 4; buf[o+3] = Math.round(buf[o+3] * (1 - fall * flow));
    }
  }

  /** Re-render the active layer as `before` transformed by matrix m (live preview; commit via commitStroke). */
  previewTransform(before: Uint8ClampedArray, m: import('./transform').Affine) {
    const id = this.doc.activeLayerId; if (!id) return;
    const out = this.wasm.transform(before, this.doc.width, this.doc.height, this.doc.width, this.doc.height, m);
    this.ensureBuffer(id).set(out); this.emit();
  }
  flipActiveLayer(horizontal: boolean) {
    const id = this.activeWritable(); if (!id) return;
    const before = this.ensureBuffer(id).slice();
    const w = this.doc.width, h = this.doc.height;
    const m: import('./transform').Affine = horizontal ? [-1,0,0,1,w,0] : [1,0,0,-1,0,h];
    const out = this.wasm.transform(before, w, h, w, h, m);
    this.ensureBuffer(id).set(out); this.pushSwap(id, before, horizontal?'Flip H':'Flip V'); this.emit();
  }

  applyTone(cell:number, angleDeg:number, color:{r:number;g:number;b:number}) {
    const id = this.activeWritable(); if (!id) return;
    const before = this.ensureBuffer(id).slice();
    this.wasm.halftone(this.ensureBuffer(id), this.doc.width, this.doc.height, cell, angleDeg, color);
    this.restoreOutside(id, before);
    this.pushSwap(id, before, 'Screentone'); this.emit();
  }

  strokeLines(segs: import('./lines').Seg[], color: RGBA, width: number) {
    const id = this.activeWritable(); if (!id) return;
    const before = this.ensureBuffer(id).slice(); const buf = this.ensureBuffer(id); const w=this.doc.width, h=this.doc.height;
    for (const s of segs) {
      const dist = Math.hypot(s.x1-s.x0, s.y1-s.y0); const n = Math.max(1, Math.floor(dist));
      for (let i=0;i<=n;i++){ const t=i/n; this.wasm.brushStamp(buf, w, h, s.x0+(s.x1-s.x0)*t, s.y0+(s.y1-s.y0)*t, width/2, 1, color, 1); }
    }
    this.restoreOutside(id, before); this.pushSwap(id, before, 'Lines'); this.emit();
  }

  undo() { this.history.undo(); }

  redo() { this.history.redo(); }
}
