import type { AIAssist, Point } from '../AIAssist';
import type { RectN } from '../../types';
import type { StudioEngine } from '../../engine';
import { HeuristicAI } from '../heuristic';
import { createSession, ort } from './runtime';
import { MODELS } from './models';
import { rgbaToNchwLetterboxed } from './image';
import { decodeYolo } from './yolo';
import { maskToSelectionCropped } from './sam';

const TARGET = 640;

export class OnnxAI implements AIAssist {
  private fallback: HeuristicAI;
  private panelSession: import('onnxruntime-web').InferenceSession | null = null;

  constructor() {
    this.fallback = new HeuristicAI();
  }

  private async panels() {
    if (!this.panelSession) {
      this.panelSession = await createSession(MODELS.panels);
    }
    return this.panelSession;
  }

  async detectPanels(px: Uint8ClampedArray, w: number, h: number): Promise<RectN[]> {
    try {
      const s = await this.panels();
      const { data, lb } = rgbaToNchwLetterboxed(px, w, h, TARGET);
      const input = new ort.Tensor('float32', data, [1, 3, TARGET, TARGET]);
      const out = await s.run({ [s.inputNames[0]]: input });
      const t = out[s.outputNames[0]];

      // Read dims from the tensor (model-agnostic)
      const dims = t.dims as number[];
      const C = dims[1];
      const N = dims[2];

      return decodeYolo(t.data as Float32Array, C, N, TARGET, lb, w, h, 0.25, 0.5);
    } catch (e) {
      console.warn('[OnnxAI] detectPanels fallback:', e);
      return this.fallback.detectPanels(px, w, h);
    }
  }

  async segment(px: Uint8ClampedArray, w: number, h: number, point: Point): Promise<Uint8Array> {
    try {
      // Dynamic import to lazy-load samClient (and worker/ort only when segment is used)
      const { segment } = await import('./samClient');
      const { mask, lw, lh, sw, sh } = await segment(px, w, h, point);
      return maskToSelectionCropped(mask, lw, lh, sw, sh, 1024, w, h);
    } catch (e) {
      console.warn('[OnnxAI] segment fallback:', e);
      return this.fallback.segment(px, w, h, point);
    }
  }

  async colorize(engine: StudioEngine): Promise<void> {
    try {
      // Lazy-load colorizeClient only when colorize is invoked
      const { colorize } = await import('./colorizeClient');
      const colored = await colorize(engine.composite(), engine.doc.width, engine.doc.height);
      engine.addLayer('raster', 'AI Color');
      engine.setBuffer(engine.doc.activeLayerId!, colored);
      engine.requestRender();
    } catch (e) {
      console.warn('[OnnxAI] colorize fallback:', e);
      return this.fallback.colorize(engine);
    }
  }
}
