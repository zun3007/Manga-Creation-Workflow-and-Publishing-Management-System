import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { createDocument } from '../../lib/studio/document';
import { StudioEngine } from '../../lib/studio/engine';
import { LayerPanel } from './LayerPanel';

let wasm: InkforgeWasm;

beforeAll(async () => {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const wasmPath = resolve(testDir, '../../../../../packages/canvas-wasm/build/inkforge.wasm');
  const bytes = readFileSync(wasmPath);
  wasm = await InkforgeWasm.load(bytes);
});

describe('LayerPanel', () => {
  it('lists layers and adds a new one', () => {
    const eng = new StudioEngine(createDocument({ width: 10, height: 10 }), wasm);
    const { rerender } = render(<LayerPanel engine={eng} version={0} />);
    expect(screen.getByText(/Layer 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add layer/i }));
    rerender(<LayerPanel engine={eng} version={1} />);
    expect(eng.doc.layers).toHaveLength(2);
  });
});
