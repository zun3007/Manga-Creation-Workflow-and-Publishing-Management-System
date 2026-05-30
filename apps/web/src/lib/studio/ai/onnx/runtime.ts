import * as ort from 'onnxruntime-web';

let configured = false;
export function configureOrtWasmPaths(): void {
  if (configured) return;
  // Serve ort's wasm from the CDN matching the installed version (robust in Vite without copy step).
  ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
  configured = true;
}
export async function createSession(url: string): Promise<ort.InferenceSession> {
  configureOrtWasmPaths();
  const eps: ort.InferenceSession.SessionOptions['executionProviders'] =
    (typeof navigator !== 'undefined' && 'gpu' in navigator) ? ['webgpu', 'wasm'] : ['wasm'];
  return ort.InferenceSession.create(url, { executionProviders: eps });
}
export async function modelExists(url: string): Promise<boolean> {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; }
}
export { ort };
