import { describe, it, expect, vi } from 'vitest';
import { modelExists } from './available';
describe('ort runtime', () => {
  it('modelExists is false when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no')));
    expect(await modelExists('/models/none.onnx')).toBe(false);
  });
});
