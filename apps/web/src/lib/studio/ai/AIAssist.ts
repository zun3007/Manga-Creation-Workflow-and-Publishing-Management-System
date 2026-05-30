import type { RectN } from '../types';
import type { StudioEngine } from '../engine';

export interface AIAssist {
  /** Suggest panel rectangles from the composited art (normalized). */
  detectPanels(composite: Uint8ClampedArray, w: number, h: number): RectN[];
  /** Add a flat-color layer beneath line art by filling enclosed regions. */
  colorize(engine: StudioEngine): void;
}
