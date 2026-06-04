import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { createDocument, addLayer } from './document';
import { StudioEngine } from './engine';

let wasmBytes: Uint8Array;
beforeEach(async function() {
  if (!wasmBytes) {
    const testDir = dirname(fileURLToPath(import.meta.url));
    const wasmPath = resolve(testDir, '../../../../../packages/canvas-wasm/build/inkforge.wasm');
    wasmBytes = new Uint8Array(readFileSync(wasmPath));
  }
});

describe('StudioEngine', () => {
  it('composites a transparent bg + one stamp to visible alpha', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 9, height: 9, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    const before = eng.beginStroke();
    eng.stamp(4, 4, 4, 1, { r:0,g:0,b:0,a:255 }, 1);
    eng.commitStroke(before);
    const out = eng.composite();
    const c = (4*9+4)*4;
    expect(out[c+3]).toBeGreaterThan(200);
  });
  it('undo restores the layer to its prior state', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 5, height: 5, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.beginStroke();
    eng.bucketFill(2, 2, { r:255,g:0,b:0,a:255 }, 0);
    let out = eng.composite(); expect(out[(2*5+2)*4]).toBe(255);
    eng.undo(); out = eng.composite(); expect(out[(2*5+2)*4+3]).toBe(0);
  });
  it('hidden layers are skipped in composite', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    let doc = createDocument({ width: 4, height: 4, background: 'transparent' });
    doc = addLayer(doc, 'raster', 'top');
    const eng = new StudioEngine(doc, wasm);
    eng.bucketFill(1, 1, { r:0,g:0,b:255,a:255 }, 0);   // fills active (top)
    eng.setLayerVisible(doc.activeLayerId!, false);
    const out = eng.composite();
    expect(out[(1*4+1)*4+3]).toBe(0);
  });
  it('duplicateLayer copies the buffer into a new layer above', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 4, height: 4, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.bucketFill(0, 0, { r:9,g:9,b:9,a:255 }, 0);
    const srcId = eng.doc.activeLayerId!;
    eng.duplicateLayer(srcId);
    expect(eng.doc.layers).toHaveLength(2);
    expect(eng.getBuffer(eng.doc.activeLayerId!)[0]).toBe(9);
  });
  it('flattenImage collapses to a single layer holding the composite', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    let doc = createDocument({ width: 4, height: 4, background: 'white' });
    doc = addLayer(doc, 'raster', 'b');
    const eng = new StudioEngine(doc, wasm);
    eng.flattenImage();
    expect(eng.doc.layers).toHaveLength(1);
  });
  it('invertSelection flips the mask', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 2, height: 1, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.setSelection(new Uint8Array([255, 0]));
    eng.invertSelection();
    expect(Array.from(eng.selectionMask!)).toEqual([0, 255]);
  });
  it('previewTransform translates layer content', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 4, height: 4, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.bucketFill(0, 0, { r:255,g:0,b:0,a:255 }, 0); // floodFill from (0,0) over an all-transparent layer fills the whole 4x4 red
    const before = eng.getBuffer(doc.activeLayerId!).slice();
    eng.previewTransform(before, [1,0,0,1,1,0]); // shift content +1 in x
    const out = eng.composite();
    expect(out[(0*4+1)*4]).toBe(255);   // (x=1,y=0) now red
    expect(out[(0*4+0)*4+3]).toBe(0);   // (x=0,y=0) shifted away → transparent
  });
  it('applyTone converts a flat gray fill into a dot pattern (mix of opaque + transparent)', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 24, height: 24, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    // fill active layer with 50% coverage (alpha 128)
    const buf = eng.getBuffer(doc.activeLayerId!); for (let i=0;i<buf.length;i+=4){ buf[i]=0; buf[i+1]=0; buf[i+2]=0; buf[i+3]=128; }
    eng.applyTone(6, 0, { r:0,g:0,b:0 });
    let opaque=0, clear=0;
    for (let i=3;i<buf.length;i+=4){ if (buf[i]>200) opaque++; else if (buf[i]<40) clear++; }
    expect(opaque).toBeGreaterThan(0); expect(clear).toBeGreaterThan(0);
  });
  it('fresh document is not dirty', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 5, height: 5, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    expect(eng.isDirty()).toBe(false);
  });
  it('becomes dirty after a paint stroke', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 5, height: 5, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.beginStroke();
    eng.bucketFill(2, 2, { r:255,g:0,b:0,a:255 }, 0);
    expect(eng.isDirty()).toBe(true);
  });
  it('becomes not dirty after markSaved', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 5, height: 5, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.beginStroke();
    eng.bucketFill(2, 2, { r:255,g:0,b:0,a:255 }, 0);
    expect(eng.isDirty()).toBe(true);
    eng.markSaved();
    expect(eng.isDirty()).toBe(false);
  });
  it('becomes dirty after addLayer', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 5, height: 5, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.addLayer('raster', 'new layer');
    expect(eng.isDirty()).toBe(true);
  });
  it('setLayerText stores and retrieves TextData', async () => {
    const wasm = await InkforgeWasm.load(wasmBytes as BufferSource);
    const doc = createDocument({ width: 100, height: 100, background: 'transparent' });
    const eng = new StudioEngine(doc, wasm);
    eng.addLayer('text', 'Text Layer');
    const layerId = eng.doc.activeLayerId!;
    const textData = {
      content: 'Hello World',
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      color: '#FF0000',
      bold: true,
      align: 'center' as const,
      vertical: false,
      x: 50,
      y: 50,
    };
    eng.setLayerText(layerId, textData);
    const layer = eng.doc.layers.find((l) => l.id === layerId);
    expect(layer).toBeDefined();
    expect(layer!.text).toEqual(textData);
  });
});
