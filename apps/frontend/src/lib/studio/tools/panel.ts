import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import type { RectN } from '../types';
import { drawFrameBorders } from '../panels';

export class PanelTool implements Tool {
  id = 'panel' as const;
  private p0: { x: number; y: number } | null = null;
  private before: Uint8ClampedArray | null = null;
  private onFrame: (r: RectN) => void;

  constructor(onFrame: (r: RectN) => void) {
    this.onFrame = onFrame;
  }

  onDown(e: PointerSample, eng: StudioEngine) {
    this.before = eng.beginStroke();
    this.p0 = { x: e.x, y: e.y };
  }

  onMove() {}

  onUp(e: PointerSample, eng: StudioEngine) {
    if (!this.p0) return;
    const w = eng.doc.width;
    const h = eng.doc.height;
    const r: RectN = {
      x: Math.min(this.p0.x, e.x) / w,
      y: Math.min(this.p0.y, e.y) / h,
      width: Math.abs(e.x - this.p0.x) / w,
      height: Math.abs(e.y - this.p0.y) / h,
    };
    if (r.width > 0.01 && r.height > 0.01) {
      drawFrameBorders(eng.getBuffer(eng.doc.activeLayerId!), w, h, [r], 3);
      eng.commitStroke(this.before, 'Panel frame');
      this.onFrame(r);
    }
    this.p0 = null;
    this.before = null;
  }
}
