import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import { rectMask, ellipseMask, lassoMask, wandMask } from '../selection';

class DragSelect implements Tool {
  id: 'select-rect'|'select-ellipse';
  protected p0:{x:number;y:number}|null=null;
  private builder: typeof rectMask;

  constructor(id: 'select-rect'|'select-ellipse', builder: typeof rectMask) {
    this.id = id;
    this.builder = builder;
  }

  onDown(e:PointerSample){ this.p0={x:e.x,y:e.y}; }
  onMove(){}
  onUp(e:PointerSample, eng:StudioEngine){ if(!this.p0)return; eng.setSelection(this.builder(eng.doc.width,eng.doc.height,this.p0.x,this.p0.y,e.x,e.y)); this.p0=null; }
}

export class SelectRectTool extends DragSelect {
  constructor(){ super('select-rect', rectMask); }
}

export class SelectEllipseTool extends DragSelect {
  constructor(){ super('select-ellipse', ellipseMask); }
}

export class LassoTool implements Tool {
  id='lasso' as const;
  private pts:{x:number;y:number}[]=[];

  onDown(e:PointerSample){ this.pts=[{x:e.x,y:e.y}]; }
  onMove(e:PointerSample){ if(this.pts.length) this.pts.push({x:e.x,y:e.y}); }
  onUp(_e:PointerSample, eng:StudioEngine){ if(this.pts.length>=3) eng.setSelection(lassoMask(eng.doc.width,eng.doc.height,this.pts)); this.pts=[]; }
}

export class WandTool implements Tool {
  id='wand' as const;
  private getTolerance: ()=>number;

  constructor(getTolerance: ()=>number) {
    this.getTolerance = getTolerance;
  }

  onDown(e:PointerSample, eng:StudioEngine){ const buf=eng.composite(); eng.setSelection(wandMask(buf,eng.doc.width,eng.doc.height,Math.floor(e.x),Math.floor(e.y),this.getTolerance())); }
  onMove(){}
  onUp(){}
}
