import type { DocumentData, LayerDocManifest, RectN } from './types';
import type { StudioEngine } from './engine';
import type { InkforgeWasm } from '@manga/canvas-wasm';
import { StudioEngine as Engine } from './engine';

export function fitContain(iw:number, ih:number, w:number, h:number) {
  const s = Math.min(w/iw, h/ih); const dw = iw*s, dh = ih*s;
  return { dx:(w-dw)/2, dy:(h-dh)/2, dw, dh };
}
export function cropBuffer(buf: Uint8ClampedArray, w:number, h:number, rx:number, ry:number, rw:number, rh:number) {
  rx=Math.max(0,rx|0); ry=Math.max(0,ry|0); rw=Math.max(1,Math.min(w-rx,rw|0)); rh=Math.max(1,Math.min(h-ry,rh|0));
  const out = new Uint8ClampedArray(rw*rh*4);
  for (let y=0;y<rh;y++){ const so=((ry+y)*w+rx)*4; out.set(buf.subarray(so, so+rw*4), y*rw*4); }
  return { buf: out, w: rw, h: rh };
}
export function buildManifest(doc: DocumentData): LayerDocManifest { return { version: 1, doc, layerImages: {} }; }

// ---- browser-only ----
export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob); const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img load')); img.src = url; });
  URL.revokeObjectURL(url); return img;
}
export function imageToBuffer(img: CanvasImageSource, iw:number, ih:number, w:number, h:number): Uint8ClampedArray {
  const c = document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d')!;
  const { dx, dy, dw, dh } = fitContain(iw, ih, w, h); ctx.clearRect(0,0,w,h); ctx.drawImage(img, dx, dy, dw, dh);
  return ctx.getImageData(0,0,w,h).data;
}
export async function bufferToPNGBlob(buf: Uint8ClampedArray, w:number, h:number): Promise<Blob> {
  const c = document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  imgData.data.set(buf);
  ctx.putImageData(imgData, 0, 0);
  return await new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/png'));
}
export const exportPNG = (eng: StudioEngine) => bufferToPNGBlob(eng.composite(), eng.doc.width, eng.doc.height);
export const exportLayerPNG = (eng: StudioEngine, id: string) => bufferToPNGBlob(eng.getBuffer(id), eng.doc.width, eng.doc.height);
export async function exportRegionPNG(eng: StudioEngine, rect: RectN): Promise<Blob> {
  const w=eng.doc.width, h=eng.doc.height;
  const c = cropBuffer(eng.composite(), w, h, Math.round(rect.x*w), Math.round(rect.y*h), Math.round(rect.width*w), Math.round(rect.height*h));
  return bufferToPNGBlob(c.buf, c.w, c.h);
}
export async function serializeDoc(eng: StudioEngine) {
  const manifest = buildManifest(eng.doc); const blobs: Record<string, Blob> = {};
  for (const l of eng.doc.layers) { if (l.kind === 'group') continue; blobs[l.id] = await bufferToPNGBlob(eng.getBuffer(l.id), eng.doc.width, eng.doc.height); }
  return { manifest, blobs };
}
export async function deserializeDoc(manifest: LayerDocManifest, wasm: InkforgeWasm): Promise<StudioEngine> {
  const eng = new Engine(manifest.doc, wasm);
  for (const [id, url] of Object.entries(manifest.layerImages)) {
    try { const blob = await (await fetch(url)).blob(); const img = await loadImageFromBlob(blob);
      eng.setBuffer(id, imageToBuffer(img, img.naturalWidth, img.naturalHeight, manifest.doc.width, manifest.doc.height)); } catch { /* skip missing layer image */ }
  }
  return eng;
}
