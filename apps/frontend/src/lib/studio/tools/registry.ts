import type { Tool } from './Tool';
import type { ToolId, BrushSettings, RGBA, RectN } from '../types';
import type { StudioEngine } from '../engine';
import { BrushTool } from './brush';
import { BucketTool, GradientTool } from './fill';
import { SelectRectTool, SelectEllipseTool, LassoTool, WandTool } from './selection';
import { MoveTool } from './transform';
import { PanelTool } from './panel';
import { LineTool } from './line';
import { TextTool } from './text';
import { BubbleTool } from './bubble';

export interface ToolDeps {
  getSettings: () => BrushSettings;
  getColor: () => RGBA;
  setColor: (c: RGBA) => void;
  getTolerance: () => number;
  getBubbleType: () => 'round' | 'spiky' | 'thought';
  getLineWidth: () => number;
  onFrame: (r: RectN) => void;
  aiSegment?: (px: Uint8ClampedArray, w: number, h: number, point: { x: number; y: number }) => Promise<void>;
}

class EyedropperTool implements Tool {
  id: ToolId = 'eyedropper';
  private setColor: (c: RGBA) => void;

  constructor(setColor: (c: RGBA) => void) {
    this.setColor = setColor;
  }

  onDown(e: { x: number; y: number }, eng: StudioEngine) {
    const c = eng.composite();
    const o = (Math.floor(e.y) * eng.doc.width + Math.floor(e.x)) * 4;
    this.setColor({ r: c[o], g: c[o + 1], b: c[o + 2], a: 255 });
  }

  onMove() {}

  onUp() {}
}

class AiSelectTool implements Tool {
  id: ToolId = 'ai-select';
  private aiSegment: (px: Uint8ClampedArray, w: number, h: number, point: { x: number; y: number }) => Promise<void>;

  constructor(aiSegment: (px: Uint8ClampedArray, w: number, h: number, point: { x: number; y: number }) => Promise<void>) {
    this.aiSegment = aiSegment;
  }

  onDown(e: { x: number; y: number }, eng: StudioEngine) {
    const px = eng.composite();
    const w = eng.doc.width;
    const h = eng.doc.height;
    this.aiSegment(px, w, h, { x: e.x, y: e.y }).catch(err => {
      console.error('[AiSelectTool] segment error:', err);
    });
  }

  onMove() {}

  onUp() {}
}

export function createTools(d: ToolDeps): Partial<Record<ToolId, Tool>> {
  const brush = (id: ToolId) =>
    new BrushTool(() => ({ ...d.getSettings(), tool: id }), d.getColor);

  return {
    brush: brush('brush'),
    pencil: brush('pencil'),
    ink: brush('ink'),
    airbrush: brush('airbrush'),
    marker: brush('marker'),
    eraser: new BrushTool(() => ({ ...d.getSettings(), tool: 'eraser' }), d.getColor),
    bucket: new BucketTool(d.getColor, d.getTolerance),
    gradient: new GradientTool(d.getColor, () => 'linear'),
    eyedropper: new EyedropperTool(d.setColor),
    'select-rect': new SelectRectTool(),
    'select-ellipse': new SelectEllipseTool(),
    lasso: new LassoTool(),
    wand: new WandTool(d.getTolerance),
    move: new MoveTool(),
    transform: new MoveTool(),
    panel: new PanelTool(d.onFrame),
    line: new LineTool(d.getColor, d.getLineWidth),
    text: new TextTool(),
    bubble: new BubbleTool(d.getBubbleType),
    'ai-select': d.aiSegment ? new AiSelectTool(d.aiSegment) : new WandTool(d.getTolerance),
    // 'pan' is handled by CanvasStage directly (no Tool dispatch)
  };
}
