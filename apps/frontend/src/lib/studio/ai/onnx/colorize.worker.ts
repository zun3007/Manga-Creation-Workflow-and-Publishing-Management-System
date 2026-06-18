// Web Worker: DeOldify colorizer inference
// Converts grayscale to color, runs in separate thread to avoid blocking main thread

import { createSession, ort } from './runtime';
import { MODELS } from './models';
import { rgbaToChw256, chw256ToRgba } from './colorize';

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

let colorizeSession: import('onnxruntime-web').InferenceSession | null = null;

async function getColorizeSession() {
  if (!colorizeSession) {
    colorizeSession = await createSession(MODELS.colorize);
  }
  return colorizeSession;
}

self.onmessage = async (e: MessageEvent<ColorizeRequest>) => {
  const { cmd, rgba, w, h } = e.data;

  if (cmd !== 'colorize') {
    self.postMessage({ ok: false, error: 'Unknown command' } as ColorizeResponse);
    return;
  }

  try {
    const session = await getColorizeSession();

    // Convert RGBA doc to CHW 256×256 float32
    const chw256 = rgbaToChw256(rgba, w, h);

    // Create input tensor: [1, 3, 256, 256], CHW layout, float32 0-255
    const inputName = session.inputNames[0];
    if (!inputName) throw new Error('Colorizer has no input');
    const inputTensor = new ort.Tensor('float32', chw256, [1, 3, 256, 256]);

    // Run inference
    const out = await session.run({ [inputName]: inputTensor });

    // Read output tensor
    const outputName = session.outputNames[0];
    if (!outputName) throw new Error('Colorizer has no output');
    const outputTensor = out[outputName];
    if (!outputTensor || !outputTensor.data) {
      throw new Error('Colorizer produced no output');
    }

    const chw256Out = outputTensor.data as Float32Array;

    // Convert CHW 256×256 back to document RGBA
    const result = chw256ToRgba(chw256Out, w, h);

    self.postMessage({ ok: true, rgba: result } as ColorizeResponse);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[colorize.worker] error:', error);
    self.postMessage({ ok: false, error } as ColorizeResponse);
  }
};
