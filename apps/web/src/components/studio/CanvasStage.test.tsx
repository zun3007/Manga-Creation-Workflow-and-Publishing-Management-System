import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { createDocument } from '../../lib/studio/document';
import { StudioEngine } from '../../lib/studio/engine';
import { makeView } from '../../lib/studio/view';
import { CanvasStage } from './CanvasStage';

let wasm: InkforgeWasm;

beforeAll(async () => {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const wasmPath = resolve(testDir, '../../../../../packages/canvas-wasm/build/inkforge.wasm');
  const bytes = readFileSync(wasmPath);
  wasm = await InkforgeWasm.load(bytes);
});

describe('CanvasStage', () => {
  it('mounts and forwards pointerdown in doc coords', () => {
    const eng = new StudioEngine(createDocument({ width: 100, height: 100 }), wasm);
    const onDown = vi.fn();
    const { container } = render(
      <CanvasStage
        engine={eng}
        view={makeView({ zoom: 1 })}
        onViewChange={() => {}}
        onPointerDown={onDown}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
      />
    );

    const cv = container.querySelector('canvas')!;
    // jsdom doesn't set offsetX; emulate via clientX and a stubbed getBoundingClientRect
    cv.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect;

    fireEvent.pointerDown(cv, { clientX: 30, clientY: 40, pressure: 0.7 });
    expect(onDown).toHaveBeenCalled();
  });
});
