import type { RectN } from '../types';
import type { StudioEngine } from '../engine';

export interface Point {
  x: number;
  y: number;
}

export interface AIAssist {
  /** Suggest panel rectangles from the composited art (normalized). */
  detectPanels(composite: Uint8ClampedArray, w: number, h: number): Promise<RectN[]>;
  /** Segment a region from a point using flood fill or ML-based selection. */
  segment(composite: Uint8ClampedArray, w: number, h: number, point: Point): Promise<Uint8Array>;
  /** Add a flat-color layer beneath line art by filling enclosed regions. */
  colorize(engine: StudioEngine): Promise<void>;
}
