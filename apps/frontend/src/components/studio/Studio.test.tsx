import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname } from 'node:path';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { createDocument } from '../../lib/studio/document';
import { StudioEngine } from '../../lib/studio/engine';
import { HeuristicAI } from '../../lib/studio/ai/heuristic';
import { Studio } from './Studio';

let wasm: InkforgeWasm;

beforeAll(async () => {
  const currentDir = dirname(fileURLToPath(pathToFileURL(__filename)));
  const wasmPath = `${currentDir}/../../../../../packages/canvas-wasm/build/inkforge.wasm`;
  const bytes = readFileSync(wasmPath);
  wasm = await InkforgeWasm.load(bytes);
});

describe('Studio', () => {
  it('mounts the studio and fires onSave', async () => {
    const eng = new StudioEngine(createDocument({ width: 200, height: 200 }), wasm);
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <Studio
        engine={eng}
        ai={new HeuristicAI()}
        onSave={onSave}
        onClose={onClose}
      />
    );

    // Check that toolbar is present with brush button (multiple buttons exist, just check one exists)
    const brushButtons = screen.getAllByRole('button', { name: /brush/i });
    expect(brushButtons.length).toBeGreaterThan(0);

    // Check that save button is present and clickable (contains Vietnamese "Lưu")
    const buttons = screen.getAllByRole('button');
    const saveButton = buttons.find(b => b.textContent?.includes('Lưu'));
    expect(saveButton).toBeDefined();
    if (saveButton) {
      fireEvent.click(saveButton);
      expect(onSave).toHaveBeenCalled();
    }
  });
});
