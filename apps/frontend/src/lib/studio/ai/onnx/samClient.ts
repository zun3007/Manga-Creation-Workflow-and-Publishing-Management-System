// Main-thread wrapper for sam.worker
// Spawns worker on first use, handles postMessage/onmessage, timeout, and cancellation

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
  sw?: number;
  sh?: number;
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

export function disposeSamWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

export async function segment(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  point: Point,
  signal?: AbortSignal
): Promise<{ mask: Float32Array; lw: number; lh: number; sw: number; sh: number }> {
  return new Promise((resolve, reject) => {
    const w_ = getWorker();
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);
      if (signal) signal.removeEventListener('abort', handleAbort);
    };

    const handleMessage = (e: MessageEvent<SegmentResponse>) => {
      cleanup();

      if (!e.data.ok) {
        reject(new Error(e.data.error || 'SAM segment failed'));
      } else if (!e.data.mask || e.data.lw === undefined || e.data.lh === undefined) {
        reject(new Error('SAM segment returned incomplete data'));
      } else {
        resolve({ mask: e.data.mask, lw: e.data.lw, lh: e.data.lh, sw: e.data.sw ?? e.data.lw, sh: e.data.sh ?? e.data.lh });
      }
    };

    const handleError = (err: ErrorEvent) => {
      cleanup();
      reject(new Error(`SAM worker error: ${err.message}`));
    };

    const handleAbort = () => {
      cleanup();
      disposeSamWorker();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    w_.addEventListener('message', handleMessage);
    w_.addEventListener('error', handleError);
    if (signal) signal.addEventListener('abort', handleAbort);

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('SAM segment timeout (15s)'));
    }, SEGMENT_TIMEOUT);

    const req: SegmentRequest = { cmd: 'segment', rgba, w, h, point };
    w_.postMessage(req);
  });
}
