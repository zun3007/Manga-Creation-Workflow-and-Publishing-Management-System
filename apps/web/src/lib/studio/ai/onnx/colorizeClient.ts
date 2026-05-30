// Main-thread wrapper for colorize.worker
// Spawns worker on first use, handles postMessage/onmessage, timeout

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

export async function colorize(
  rgba: Uint8ClampedArray,
  w: number,
  h: number
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const w_ = getWorker();
    let timeoutId: NodeJS.Timeout | null = null;

    const handleMessage = (e: MessageEvent<ColorizeResponse>) => {
      if (timeoutId) clearTimeout(timeoutId);
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);

      if (!e.data.ok) {
        reject(new Error(e.data.error || 'Colorize failed'));
      } else if (!e.data.rgba) {
        reject(new Error('Colorize returned no rgba data'));
      } else {
        resolve(e.data.rgba);
      }
    };

    const handleError = (err: ErrorEvent) => {
      if (timeoutId) clearTimeout(timeoutId);
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);
      reject(new Error(`Colorize worker error: ${err.message}`));
    };

    w_.addEventListener('message', handleMessage);
    w_.addEventListener('error', handleError);

    timeoutId = setTimeout(() => {
      w_.removeEventListener('message', handleMessage);
      w_.removeEventListener('error', handleError);
      reject(new Error('Colorize timeout (60s)'));
    }, COLORIZE_TIMEOUT);

    const req: ColorizeRequest = { cmd: 'colorize', rgba, w, h };
    w_.postMessage(req);
  });
}
