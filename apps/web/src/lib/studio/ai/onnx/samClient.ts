// Main-thread wrapper for sam.worker
// Spawns worker on first use, handles postMessage/onmessage, timeout

import type { Point } from '../AIAssist';

interface SegmentRequest {
  cmd: 'segment';
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  point: Point;
}

interface SegmentResponse {
  ok: boolean;
  mask?: Float32Array;
  lw?: number;
  lh?: number;
  error?: string;
}

let worker: Worker | null = null;
const SEGMENT_TIMEOUT = 15000; // 15s

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./sam.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export async function segment(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  point: Point
): Promise<{ mask: Float32Array; lw: number; lh: number }> {
  return new Promise((resolve, reject) => {
    const w_ = getWorker();
    let timeoutId: NodeJS.Timeout | null = null;

    const handleMessage = (e: MessageEvent<SegmentResponse>) => {
      if (timeoutId) clearTimeout(timeoutId);
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);

      if (!e.data.ok) {
        reject(new Error(e.data.error || 'SAM segment failed'));
      } else if (!e.data.mask || e.data.lw === undefined || e.data.lh === undefined) {
        reject(new Error('SAM segment returned incomplete data'));
      } else {
        resolve({ mask: e.data.mask, lw: e.data.lw, lh: e.data.lh });
      }
    };

    const handleError = (err: ErrorEvent) => {
      if (timeoutId) clearTimeout(timeoutId);
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);
      reject(new Error(`SAM worker error: ${err.message}`));
    };

    w_.addEventListener('message', handleMessage);
    w_.addEventListener('error', handleError);

    timeoutId = setTimeout(() => {
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);
      reject(new Error('SAM segment timeout (15s)'));
    }, SEGMENT_TIMEOUT);

    const req: SegmentRequest = { cmd: 'segment', rgba, w, h, point };
    w_.postMessage(req);
  });
}
