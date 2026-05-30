import { describe, it, expect } from 'vitest';
import { OnnxAI } from './OnnxAI';

describe('OnnxAI', () => {
  it('detectPanels falls back to heuristic when no model present', async () => {
    const ai = new OnnxAI();
    const px = new Uint8ClampedArray(12 * 12 * 4);
    px.fill(255);
    // createSession on a missing /models/manga-panels.onnx → throws → heuristic fallback
    const rects = await ai.detectPanels(px, 12, 12);
    expect(Array.isArray(rects)).toBe(true);
  });
});
