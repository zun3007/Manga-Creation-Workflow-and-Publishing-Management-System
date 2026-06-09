/**
 * Lightweight model-availability check. Deliberately does NOT import onnxruntime-web,
 * so callers (e.g. the studio pages) can check availability WITHOUT pulling the ~26 MB
 * ORT runtime into the eager bundle. `OnnxAI` (which imports ort) is dynamically
 * imported only when a model is actually present.
 */
export async function modelExists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}
