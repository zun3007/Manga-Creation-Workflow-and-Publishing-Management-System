import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { InkforgeWasm } from '../src/index';

describe('InkforgeWasm loader', () => {
  it('loads from bytes and runs floodFill on a Uint8ClampedArray', async () => {
    const bytes = readFileSync(fileURLToPath(new URL('../build/inkforge.wasm', import.meta.url)));
    const wasm = await InkforgeWasm.load(bytes);
    const w = 3, h = 3;
    const px = new Uint8ClampedArray(w*h*4); // all transparent
    const filled = wasm.floodFill(px, w, h, 1, 1, { r:0,g:128,b:255,a:255 }, 0);
    expect(filled).toBe(9);
    expect([px[0],px[1],px[2],px[3]]).toEqual([0,128,255,255]);
  });
});
