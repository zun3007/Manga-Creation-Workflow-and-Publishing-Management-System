import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import type { RGBA } from '../types';

export class BucketTool implements Tool {
  id = 'bucket' as const;
  private getColor: () => RGBA;
  private getTolerance: () => number;

  constructor(getColor: () => RGBA, getTolerance: () => number) {
    this.getColor = getColor;
    this.getTolerance = getTolerance;
  }

  onDown(e: PointerSample, eng: StudioEngine): void {
    eng.bucketFill(e.x, e.y, this.getColor(), this.getTolerance());
  }

  onMove(): void {}

  onUp(): void {}
}

export function paintGradient(
  buf: Uint8ClampedArray,
  w: number,
  h: number,
  type: 'linear' | 'radial',
  c0: RGBA,
  c1: RGBA,
  p0: { x: number; y: number },
  p1: { x: number; y: number }
): void {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len2 = dx * dx + dy * dy || 1;
  const maxR = Math.hypot(dx, dy) || 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t =
        type === 'linear'
          ? ((x - p0.x) * dx + (y - p0.y) * dy) / len2
          : Math.hypot(x - p0.x, y - p0.y) / maxR;
      t = Math.max(0, Math.min(1, t));
      const o = (y * w + x) * 4;
      buf[o] = Math.round(c0.r + (c1.r - c0.r) * t);
      buf[o + 1] = Math.round(c0.g + (c1.g - c0.g) * t);
      buf[o + 2] = Math.round(c0.b + (c1.b - c0.b) * t);
      buf[o + 3] = Math.round(c0.a + (c1.a - c0.a) * t);
    }
  }
}

export class GradientTool implements Tool {
  id = 'gradient' as const;
  private p0: { x: number; y: number } | null = null;
  private before: Uint8ClampedArray | null = null;
  private getColor: () => RGBA;
  private getType: () => 'linear' | 'radial';

  constructor(getColor: () => RGBA, getType: () => 'linear' | 'radial') {
    this.getColor = getColor;
    this.getType = getType;
  }

  onDown(e: PointerSample, eng: StudioEngine): void {
    this.before = eng.beginStroke();
    this.p0 = { x: e.x, y: e.y };
  }

  onMove(): void {}

  onUp(e: PointerSample, eng: StudioEngine): void {
    if (!this.p0) return;
    const id = eng.doc.activeLayerId;
    if (!id) return;
    const buf = eng.getBuffer(id);
    const color = this.getColor();
    paintGradient(
      buf,
      eng.doc.width,
      eng.doc.height,
      this.getType(),
      color,
      { r: color.r, g: color.g, b: color.b, a: 0 },
      this.p0,
      { x: e.x, y: e.y }
    );
    eng.commitStroke(this.before, 'Gradient');
    this.p0 = null;
    this.before = null;
  }
}
