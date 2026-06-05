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
  // Ensure at least one intermediate point for large gaps (high-speed strokes)
  const n = Math.max(1, Math.floor(dist / step));
  const pts: { x: number; y: number }[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n; // even spacing, endpoint-inclusive (n>=1 fills high-speed gaps)
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

/** Per-tool character so ink/pencil/airbrush/marker actually differ from a plain brush.
 *  Modifiers layer on top of the user's size/opacity/flow sliders. */
interface BrushProfile {
  hardness?: number; opacityMul?: number; flowMul?: number;
  pressureSize?: boolean; pressureOpacity?: boolean; spacingMul?: number;
}
const BRUSH_PROFILES: Record<string, BrushProfile> = {
  // G-pen: crisp hard edge, fully opaque, strong size-taper from pressure, tight spacing
  ink: { hardness: 1.0, opacityMul: 1.0, flowMul: 1.0, pressureSize: true, pressureOpacity: false, spacingMul: 0.5 },
  pencil: { hardness: 0.55, opacityMul: 0.85, flowMul: 0.9, pressureOpacity: true },
  airbrush: { hardness: 0.12, opacityMul: 0.55, flowMul: 0.3, pressureOpacity: true, spacingMul: 0.4 },
  marker: { hardness: 0.9, opacityMul: 0.7, flowMul: 1.0, pressureSize: false, spacingMul: 0.7 },
};

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
    if (s.tool === 'eraser') {
      const r = pressureSize(s.size, pressure, s.pressureSize) / 2;
      eng.erase(x, y, r, 1, pressureOpacity(s.flow, pressure, s.pressureOpacity));
      return;
    }
    const p = BRUSH_PROFILES[s.tool] ?? {};
    const radius = pressureSize(s.size, pressure, p.pressureSize ?? s.pressureSize) / 2;
    const flow = pressureOpacity((p.flowMul ?? 1) * s.flow, pressure, p.pressureOpacity ?? s.pressureOpacity);
    const hardness = p.hardness ?? s.hardness;
    const opacity = Math.round(255 * Math.min(1, (p.opacityMul ?? 1) * s.opacity));
    const c = this.getColor();
    eng.stamp(x, y, radius, hardness, { r: c.r, g: c.g, b: c.b, a: opacity }, flow);
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
    const spacing = Math.max(1, s.size * s.spacing * (BRUSH_PROFILES[s.tool]?.spacingMul ?? 1));
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
