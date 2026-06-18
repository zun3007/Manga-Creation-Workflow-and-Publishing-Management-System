// Main-thread wrapper for colorize.worker
// Spawns worker on first use, handles postMessage/onmessage, timeout, and cancellation

interface ColorizeRequest {
  cmd: 'colorize';
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
}

interface ColorizeResponse {
  ok: boolean;
  rgba?: Uint8ClampedArray;
  error?: string;
}

let worker: Worker | null = null;
const COLORIZE_TIMEOUT = 60000; // 60s (CPU inference can be slow)

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./colorize.worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function disposeColorizeWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

export async function colorize(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  signal?: AbortSignal
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const w_ = getWorker();
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);
      if (signal) signal.removeEventListener('abort', handleAbort);
    };

    const handleMessage = (e: MessageEvent<ColorizeResponse>) => {
      cleanup();

      if (!e.data.ok) {
        reject(new Error(e.data.error || 'Colorize failed'));
      } else if (!e.data.rgba) {
        reject(new Error('Colorize returned no rgba data'));
      } else {
        resolve(e.data.rgba);
      }
    };

    const handleError = (err: ErrorEvent) => {
      cleanup();
      reject(new Error(`Colorize worker error: ${err.message}`));
    };

    const handleAbort = () => {
      cleanup();
      disposeColorizeWorker();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    w_.addEventListener('message', handleMessage);
    w_.addEventListener('error', handleError);
    if (signal) signal.addEventListener('abort', handleAbort);

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Colorize timeout (60s)'));
    }, COLORIZE_TIMEOUT);

    const req: ColorizeRequest = { cmd: 'colorize', rgba, w, h };
    w_.postMessage(req);
  });
}
