// Web Worker: MobileSAM encoder + decoder inference
// Caches image embedding per image; decodes with point prompt

import { createSession, ort } from './runtime';
import { MODELS } from './models';
import { rgbaToNchwLetterboxed } from './image';
import { pointToSamCoords } from './sam';
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

let encoderSession: import('onnxruntime-web').InferenceSession | null = null;
let decoderSession: import('onnxruntime-web').InferenceSession | null = null;

// Cache image embedding by image dimensions hash (simple key for v1)
let cachedEmbedding: Float32Array | null = null;
let cachedImageKey: string | null = null;

async function getEncoderSession() {
  if (!encoderSession) {
    encoderSession = await createSession(MODELS.samEncoder);
  }
  return encoderSession;
}

async function getDecoderSession() {
  if (!decoderSession) {
    decoderSession = await createSession(MODELS.samDecoder);
  }
  return decoderSession;
}

async function encodeImage(rgba: Uint8ClampedArray, w: number, h: number): Promise<Float32Array> {
  // Simple cache key: "w,h" (cache only per image size for v1)
  const key = `${w},${h}`;
  if (cachedImageKey === key && cachedEmbedding) {
    return cachedEmbedding;
  }

  const encoder = await getEncoderSession();
  const { data } = rgbaToNchwLetterboxed(rgba, w, h, 1024);
  const input = new ort.Tensor('float32', data, [1, 3, 1024, 1024]);

  // Read encoder input/output names defensively
  const inputName = encoder.inputNames[0];
  if (!inputName) throw new Error('SAM encoder has no input');
  const outputName = encoder.outputNames[0];
  if (!outputName) throw new Error('SAM encoder has no output');

  const out = await encoder.run({ [inputName]: input });
  const embeddingTensor = out[outputName];
  if (!embeddingTensor || !embeddingTensor.data) {
    throw new Error('SAM encoder produced no output');
  }

  cachedEmbedding = embeddingTensor.data as Float32Array;
  cachedImageKey = key;
  return cachedEmbedding;
}

async function decodeSegment(
  embedding: Float32Array,
  w: number,
  h: number,
  point: Point
): Promise<{ mask: Float32Array; lw: number; lh: number }> {
  const decoder = await getDecoderSession();

  // Build decoder inputs BY NAME (SAM decoders vary; only include present inputs)
  const inputs: Record<string, import('onnxruntime-web').Tensor> = {};
  const inputNames = decoder.inputNames;

  // image_embeddings: [1, 256, 64, 64]
  if (inputNames.includes('image_embeddings')) {
    inputs['image_embeddings'] = new ort.Tensor('float32', embedding, [1, 256, 64, 64]);
  }

  // point_coords: scale doc point → 1024-space SAM coords, then build [1, 2, 2] (point + padding)
  const samCoords = pointToSamCoords(point, w, h, 1024);
  if (inputNames.includes('point_coords')) {
    const coords = new Float32Array([[samCoords.x, samCoords.y], [0, 0]].flat());
    inputs['point_coords'] = new ort.Tensor('float32', coords, [1, 2, 2]);
  }

  // point_labels: [1, 2] = [[1, -1]]
  if (inputNames.includes('point_labels')) {
    inputs['point_labels'] = new ort.Tensor('float32', new Float32Array([1, -1]), [1, 2]);
  }

  // mask_input: [1, 1, 256, 256] zeros (no prior mask)
  if (inputNames.includes('mask_input')) {
    inputs['mask_input'] = new ort.Tensor('float32', new Float32Array(1 * 1 * 256 * 256), [
      1, 1, 256, 256,
    ]);
  }

  // has_mask_input: [1] = [0]
  if (inputNames.includes('has_mask_input')) {
    inputs['has_mask_input'] = new ort.Tensor('float32', new Float32Array([0]), [1]);
  }

  // orig_im_size: [1, 2] = [1024, 1024] (NCHW padding size, not original doc size)
  if (inputNames.includes('orig_im_size')) {
    inputs['orig_im_size'] = new ort.Tensor('float32', new Float32Array([1024, 1024]), [1, 2]);
  }

  const out = await decoder.run(inputs);

  // Pick output: prefer 'masks' or 'low_res_masks'
  let maskTensor: import('onnxruntime-web').Tensor | undefined;
  for (const name of ['masks', 'low_res_masks', ...decoder.outputNames]) {
    if (out[name]) {
      maskTensor = out[name];
      break;
    }
  }

  if (!maskTensor || !maskTensor.data) {
    throw new Error('SAM decoder produced no output');
  }

  // Extract mask dims: likely [1, 1, H, W], read from tensor
  const dims = maskTensor.dims as number[];
  const lw = dims[dims.length - 1];
  const lh = dims[dims.length - 2];

  return {
    mask: maskTensor.data as Float32Array,
    lw,
    lh,
  };
}

self.onmessage = async (e: MessageEvent<SegmentRequest>) => {
  const { cmd, rgba, w, h, point } = e.data;

  if (cmd !== 'segment') {
    self.postMessage({ ok: false, error: 'Unknown command' } as SegmentResponse);
    return;
  }

  try {
    const embedding = await encodeImage(rgba, w, h);
    const { mask, lw, lh } = await decodeSegment(embedding, w, h, point);
    self.postMessage({ ok: true, mask, lw, lh } as SegmentResponse);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[sam.worker] error:', error);
    self.postMessage({ ok: false, error } as SegmentResponse);
  }
};
