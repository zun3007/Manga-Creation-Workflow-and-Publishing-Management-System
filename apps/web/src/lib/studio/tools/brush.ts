import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import type { BrushSettings, RGBA } from '../types';

export function interpolateStamps(
  from: { x: number; y: number },
  to: { x: number; y: number },
  spacingPx: number
) {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(0.5, spacingPx);
  const n = Math.floor(dist / step);
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const t = (i * step) / dist;
    pts.push({ x: from.x + dx * t, y: from.y + dy * t });
  }
  return pts;
}

export function pressureSize(base: number, pressure: number, enabled: boolean) {
  return enabled ? base * (0.25 + 0.75 * pressure) : base;
}

export function pressureOpacity(base: number, pressure: number, enabled: boolean) {
  return enabled ? base * pressure : base;
}

export class BrushTool implements Tool {
  id: BrushSettings['tool'];
  private getSettings: () => BrushSettings;
  private getColor: () => RGBA;
  private last: { x: number; y: number } | null = null;
  private before: Uint8ClampedArray | null = null;
  private smX = 0;
  private smY = 0;

  constructor(getSettings: () => BrushSettings, getColor: () => RGBA) {
    this.getSettings = getSettings;
    this.getColor = getColor;
    this.id = getSettings().tool;
  }

  private stampAt(eng: StudioEngine, x: number, y: number, pressure: number) {
    const s = this.getSettings();
    const isEraser = s.tool === 'eraser';
    const radius = pressureSize(s.size, pressure, s.pressureSize) / 2;
    const flow = pressureOpacity(s.flow, pressure, s.pressureOpacity);
    if (isEraser) {
      eng.erase(x, y, radius, 1, flow);
      return;
    }
    const c = this.getColor();
    eng.stamp(x, y, radius, s.hardness, { r: c.r, g: c.g, b: c.b, a: Math.round(255 * s.opacity) }, flow);
  }

  onDown(e: PointerSample, eng: StudioEngine) {
    this.before = eng.beginStroke();
    this.smX = e.x;
    this.smY = e.y;
    this.last = { x: e.x, y: e.y };
    this.stampAt(eng, e.x, e.y, e.pressure);
    eng.requestRender();
  }

  onMove(e: PointerSample, eng: StudioEngine) {
    if (!this.last) return;
    const s = this.getSettings();
    const a = Math.min(0.95, Math.max(0, s.stabilize));
    this.smX += (e.x - this.smX) * (1 - a);
    this.smY += (e.y - this.smY) * (1 - a);
    const pt = { x: this.smX, y: this.smY };
    const spacing = Math.max(1, s.size * s.spacing);
    for (const p of interpolateStamps(this.last, pt, spacing)) {
      this.stampAt(eng, p.x, p.y, e.pressure);
    }
    this.last = pt;
    eng.requestRender();
  }

  onUp(_e: PointerSample, eng: StudioEngine) {
    eng.commitStroke(this.before, this.id === 'eraser' ? 'Erase' : 'Brush');
    this.last = null;
    this.before = null;
  }
}
