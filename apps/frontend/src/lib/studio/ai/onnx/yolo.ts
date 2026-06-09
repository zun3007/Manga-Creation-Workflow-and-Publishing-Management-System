import type { RectN } from '../../types';
export interface Letterbox { scale: number; padX: number; padY: number }
export function letterbox(iw: number, ih: number, target: number): Letterbox {
  const scale = target / Math.max(iw, ih);
  return { scale, padX: (target - iw * scale) / 2, padY: (target - ih * scale) / 2 };
}
export function iou(a: number[], b: number[]): number {
  const ax2=a[0]+a[2], ay2=a[1]+a[3], bx2=b[0]+b[2], by2=b[1]+b[3];
  const ix=Math.max(a[0],b[0]), iy=Math.max(a[1],b[1]), ix2=Math.min(ax2,bx2), iy2=Math.min(ay2,by2);
  const iw=Math.max(0,ix2-ix), ih=Math.max(0,iy2-iy); const inter=iw*ih;
  const uni=a[2]*a[3]+b[2]*b[3]-inter; return uni<=0?0:inter/uni;
}
export interface Det { box: number[]; score: number }  // box = [x,y,w,h] in model space (xywh top-left)
export function nms(dets: Det[], thr: number): Det[] {
  const sorted=[...dets].sort((p,q)=>q.score-p.score); const keep: Det[]=[];
  for (const d of sorted) { if (keep.every(k=>iou(k.box,d.box)<thr)) keep.push(d); }
  return keep;
}
/** Decode a YOLOv8-style [1,(4+nc),N] flat buffer (row-major over C then N) → normalized RectN[]. */
export function decodeYolo(data: Float32Array, C: number, N: number, _target: number, lb: Letterbox, iw: number, ih: number, scoreThr: number, nmsThr: number): RectN[] {
  const nc = C - 4; const dets: Det[] = [];
  const at = (c: number, n: number) => data[c * N + n];
  for (let n = 0; n < N; n++) {
    let best = 0; for (let c = 0; c < nc; c++) best = Math.max(best, at(4 + c, n));
    if (best < scoreThr) continue;
    const cx = at(0,n), cy = at(1,n), w = at(2,n), h = at(3,n);
    dets.push({ box: [cx - w/2, cy - h/2, w, h], score: best });
  }
  const kept = nms(dets, nmsThr);
  return kept.map(d => {
    // undo letterbox → original-image px → normalize
    const x = (d.box[0] - lb.padX) / lb.scale, y = (d.box[1] - lb.padY) / lb.scale;
    const w = d.box[2] / lb.scale, h = d.box[3] / lb.scale;
    return { x: Math.max(0, x/iw), y: Math.max(0, y/ih), width: Math.min(1, w/iw), height: Math.min(1, h/ih) };
  });
}
