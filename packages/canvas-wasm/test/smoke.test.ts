import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

describe('inkforge.wasm smoke', () => {
  it('instantiates and fillRect writes pixels', async () => {
    const url = new URL('../build/inkforge.wasm', import.meta.url);
    const bytes = readFileSync(fileURLToPath(url));
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const ex = instance.exports as any;
    const w = 4, h = 4, len = w * h * 4;
    const ptr = ex.alloc(len);
    ex.fillRect(ptr, w, h, 255, 0, 0, 255);
    const view = new Uint8ClampedArray((ex.memory as WebAssembly.Memory).buffer, ptr, len);
    expect([view[0], view[1], view[2], view[3]]).toEqual([255, 0, 0, 255]);
    ex.free(ptr);
  });
});
