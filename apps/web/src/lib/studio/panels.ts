import type { RectN } from './types';

export type PanelTemplate = '1'|'2row'|'3row'|'4koma'|'2col'|'2x2'|'3x2';

function rows(counts: number[], g: number): RectN[] {
  const out: RectN[] = []; const rh = (1 - (counts.length + 1) * g) / counts.length; let y = g;
  for (const c of counts) {
    const cw = (1 - (c + 1) * g) / c; let x = g;
    for (let i = 0; i < c; i++) { out.push({ x, y, width: cw, height: rh }); x += cw + g; }
    y += rh + g;
  }
  return out;
}

export function templateFrames(t: PanelTemplate, gutter = 0.02): RectN[] {
  const g = gutter;
  switch (t) {
    case '1': return rows([1], g);
    case '2row': return rows([1,1], g);
    case '3row': return rows([1,1,1], g);
    case '4koma': return rows([1,1,1,1], g);
    case '2col': return rows([2], g);
    case '2x2': return rows([2,2], g);
    case '3x2': return rows([2,2,2], g);
  }
}

export function drawFrameBorders(buf: Uint8ClampedArray, w:number, h:number, frames: RectN[], thickness = 3) {
  const set = (x:number,y:number)=>{ if (x<0||y<0||x>=w||y>=h) return; const o=(y*w+x)*4; buf[o]=0; buf[o+1]=0; buf[o+2]=0; buf[o+3]=255; };
  for (const f of frames) {
    const x0=Math.round(f.x*w), y0=Math.round(f.y*h), x1=Math.round((f.x+f.width)*w), y1=Math.round((f.y+f.height)*h);
    for (let t=0;t<thickness;t++){ for (let x=x0;x<=x1;x++){ set(x,y0+t); set(x,y1-t); } for (let y=y0;y<=y1;y++){ set(x0+t,y); set(x1-t,y); } }
  }
}
