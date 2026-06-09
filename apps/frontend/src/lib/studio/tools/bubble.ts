import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import { drawBubble, type BubbleType } from '../bubbles';

export class BubbleTool implements Tool {
  id = 'bubble' as const;
  private p0: { x: number; y: number } | null = null;
  private before: Uint8ClampedArray | null = null;
  private getType: () => BubbleType;

  constructor(getType: () => BubbleType) {
    this.getType = getType;
  }

  onDown(e: PointerSample, eng: StudioEngine): void {
    this.before = eng.beginStroke();
    this.p0 = { x: e.x, y: e.y };
  }

  onMove(): void {}

  onUp(e: PointerSample, eng: StudioEngine): void {
    if (!this.p0) return;
    const rect = {
      x: Math.min(this.p0.x, e.x),
      y: Math.min(this.p0.y, e.y),
      width: Math.abs(e.x - this.p0.x),
      height: Math.abs(e.y - this.p0.y),
    };
    if (rect.width > 4 && rect.height > 4) {
      drawBubble(
        eng.getBuffer(eng.doc.activeLayerId!),
        eng.doc.width,
        eng.doc.height,
        this.getType(),
        rect,
        { x: rect.x + rect.width / 2, y: rect.y + rect.height + 24 }
      );
      eng.commitStroke(this.before, 'Bubble');
    }
    this.p0 = null;
    this.before = null;
  }
}
