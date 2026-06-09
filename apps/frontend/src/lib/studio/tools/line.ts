import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import type { RGBA } from '../types';

export class LineTool implements Tool {
  id = 'line' as const;
  private p0: { x: number; y: number } | null = null;
  private getColor: () => RGBA;
  private getWidth: () => number;

  constructor(getColor: () => RGBA, getWidth: () => number) {
    this.getColor = getColor;
    this.getWidth = getWidth;
  }

  onDown(e: PointerSample): void {
    this.p0 = { x: e.x, y: e.y };
  }

  onMove(): void {}

  onUp(e: PointerSample, eng: StudioEngine): void {
    if (!this.p0) return;
    eng.strokeLines([{ x0: this.p0.x, y0: this.p0.y, x1: e.x, y1: e.y }], this.getColor(), this.getWidth());
    this.p0 = null;
  }
}
