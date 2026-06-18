import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';

let ex: any, mem: WebAssembly.Memory;
function buf(ptr: number, len: number) { return new Uint8ClampedArray(mem.buffer, ptr, len); }

beforeAll(async () => {
  const bytes = readFileSync(fileURLToPath(new URL('../build/inkforge.wasm', import.meta.url)));
  const { instance } = await WebAssembly.instantiate(bytes, {});
  ex = instance.exports; mem = ex.memory;
});

describe('floodFill', () => {
  it('fills a bounded transparent area up to opaque borders', () => {
    const w = 5, h = 5, len = w*h*4;
    const ptr = ex.alloc(len); const px = buf(ptr, len); px.fill(0);
    const set=(x:number,y:number,r:number,g:number,b:number,a:number)=>{const o=(y*w+x)*4;px[o]=r;px[o+1]=g;px[o+2]=b;px[o+3]=a;};
    for (let i=0;i<w;i++){set(i,0,0,0,0,255);set(i,4,0,0,0,255);set(0,i,0,0,0,255);set(4,i,0,0,0,255);}
    const filled = ex.floodFill(ptr, w, h, 2, 2, 255, 0, 0, 255, 10);
    expect(filled).toBe(9); // inner 3x3
    const center=(2*w+2)*4;
    expect([px[center],px[center+1],px[center+2],px[center+3]]).toEqual([255,0,0,255]);
    const corner=(0*w+0)*4;
    expect(px[corner+3]).toBe(255); expect(px[corner]).toBe(0);
    ex.free(ptr);
  });
});

describe('composite normal', () => {
  it('blends src over dst by opacity', () => {
    const w=1,h=1,len=4;
    const d=ex.alloc(len), s=ex.alloc(len);
    const dp=buf(d,len), sp=buf(s,len);
    dp.set([0,0,0,255]); sp.set([255,255,255,255]);
    ex.composite(d, s, w, h, 0.5, 0); // normal, 50%
    expect(dp[0]).toBeGreaterThanOrEqual(126); expect(dp[0]).toBeLessThanOrEqual(128);
    ex.free(d); ex.free(s);
  });
});

describe('brushStamp', () => {
  it('paints opaque at center, fades at edge', () => {
    const w=9,h=9,len=w*h*4; const p=ex.alloc(len); const px=buf(p,len); px.fill(0);
    ex.brushStamp(p, w, h, 4, 4, 4, 0.5, 0, 0, 0, 255, 1.0);
    const c=(4*w+4)*4; expect(px[c+3]).toBeGreaterThan(200);
    const edge=(4*w+0)*4; expect(px[edge+3]).toBeLessThan(px[c+3]);
    ex.free(p);
  });
});
