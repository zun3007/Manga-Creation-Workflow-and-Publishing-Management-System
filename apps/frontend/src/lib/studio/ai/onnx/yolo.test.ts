import { describe, it, expect } from 'vitest';
import { letterbox, iou, nms, decodeYolo } from './yolo';

describe('yolo helpers', () => {
  it('letterbox computes scale + pad to a square target preserving aspect', () => {
    const r = letterbox(200, 100, 640);
    expect(r.scale).toBeCloseTo(3.2);            // 640/200
    expect(r.padX).toBeCloseTo(0); expect(r.padY).toBeCloseTo(160); // (640-320)/2
  });
  it('iou of identical boxes is 1, disjoint is 0', () => {
    expect(iou([0,0,10,10],[0,0,10,10])).toBeCloseTo(1);
    expect(iou([0,0,10,10],[20,20,10,10])).toBe(0);
  });
  it('nms drops overlapping lower-score boxes', () => {
    const kept = nms([{box:[0,0,10,10],score:0.9},{box:[1,1,10,10],score:0.5},{box:[100,100,5,5],score:0.8}], 0.5);
    expect(kept.length).toBe(2);
  });
  it('decodeYolo reads [1,(4+nc),N] output, scales boxes back through letterbox to normalized RectN', () => {
    // 1 class, 1 anchor centered box (cx,cy,w,h)=(320,320,320,320) in 640-space, score 0.9
    const N=1, C=5; const data=new Float32Array(C*N);
    data[0]=320; data[1]=320; data[2]=320; data[3]=320; data[4]=0.9;
    const lb={scale:3.2,padX:0,padY:160}; // from a 200x100 image
    const rects = decodeYolo(data, C, N, 640, lb, 200, 100, 0.25, 0.5);
    expect(rects.length).toBe(1);
    expect(rects[0].x).toBeCloseTo(0.25, 1); expect(rects[0].width).toBeCloseTo(0.5, 1);
  });
});
