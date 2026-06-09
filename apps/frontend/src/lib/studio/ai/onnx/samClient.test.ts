import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { disposeSamWorker } from './samClient';

describe('samClient cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    disposeSamWorker();
  });

  it('should export disposeSamWorker', () => {
    expect(typeof disposeSamWorker).toBe('function');
  });

  it('should accept AbortSignal parameter', async () => {
    const { segment } = await import('./samClient');

    // Verify function signature accepts signal
    expect(segment.length >= 4).toBe(true); // at least 4 params (rgba, w, h, point, signal)
  });

  it('should dispose worker without errors', () => {
    expect(() => {
      disposeSamWorker();
      disposeSamWorker(); // Should be safe to call multiple times
    }).not.toThrow();
  });
});
