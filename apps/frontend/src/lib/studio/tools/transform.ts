import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import { composeAffine } from '../transform';

export class MoveTool implements Tool {
  id='move' as const;
  private before: Uint8ClampedArray | null = null;
  private start: {x:number;y:number} | null = null;

  onDown(e:PointerSample, eng:StudioEngine) {
    this.before = eng.beginStroke();
    this.start = {x:e.x, y:e.y};
  }

  onMove(e:PointerSample, eng:StudioEngine) {
    if (!this.before || !this.start) return;
    eng.previewTransform(this.before, composeAffine({ tx:e.x-this.start.x, ty:e.y-this.start.y }));
  }

  onUp(_e:PointerSample, eng:StudioEngine) {
    eng.commitStroke(this.before, 'Move');
    this.before = null;
    this.start = null;
  }
}
