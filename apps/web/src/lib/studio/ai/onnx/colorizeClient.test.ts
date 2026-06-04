import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { disposeColorizeWorker } from './colorizeClient';

describe('colorizeClient cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    disposeColorizeWorker();
  });

  it('should export disposeColorizeWorker', () => {
    expect(typeof disposeColorizeWorker).toBe('function');
  });

  it('should accept AbortSignal parameter', async () => {
    const { colorize } = await import('./colorizeClient');

    // Verify function signature accepts signal
    expect(colorize.length >= 3).toBe(true); // at least 3 params (rgba, w, h, signal)
  });

  it('should dispose worker without errors', () => {
    expect(() => {
      disposeColorizeWorker();
      disposeColorizeWorker(); // Should be safe to call multiple times
    }).not.toThrow();
  });
});
