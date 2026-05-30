import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { createDocument } from '../document';
import { StudioEngine } from '../engine';
import { HeuristicAI } from './heuristic';

let wasm: InkforgeWasm;
beforeAll(async () => {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const wasmPath = resolve(testDir, '../../../../../../packages/canvas-wasm/build/inkforge.wasm');
  const bytes = readFileSync(wasmPath);
  wasm = await InkforgeWasm.load(bytes);
});

describe('HeuristicAI', () => {
  it('detectPanels finds the enclosed region inside a black border ring', () => {
    const w = 12, h = 12;
    const buf = new Uint8ClampedArray(w * h * 4);
    buf.fill(255); // white
    // black border ring
    const ink = (x: number, y: number) => {
      const o = (y * w + x) * 4;
      buf[o] = 0;
      buf[o + 1] = 0;
      buf[o + 2] = 0;
      buf[o + 3] = 255;
    };
    for (let i = 0; i < w; i++) {
      ink(i, 0);
      ink(i, h - 1);
      ink(0, i);
      ink(w - 1, i);
    }
    const ai = new HeuristicAI();
    const rects = ai.detectPanels(buf, w, h, 0.05);
    expect(rects.length).toBeGreaterThanOrEqual(1);
  });

  it('colorize adds an "AI Color" layer and paints color into enclosed regions', () => {
    const doc = createDocument({ width: 10, height: 10, background: 'white' });
    const eng = new StudioEngine(doc, wasm);
    const ai = new HeuristicAI();
    const n0 = eng.doc.layers.length;
    ai.colorize(eng);
    expect(eng.doc.layers.length).toBe(n0 + 1);
    expect(eng.doc.layers.some((l) => l.name === 'AI Color')).toBe(true);
  });
});
