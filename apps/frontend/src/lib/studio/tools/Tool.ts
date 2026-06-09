import type { StudioEngine } from '../engine';
import type { ToolId } from '../types';

export interface PointerSample {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
}

export interface Tool {
  id: ToolId;
  onDown(e: PointerSample, eng: StudioEngine): void;
  onMove(e: PointerSample, eng: StudioEngine): void;
  onUp(e: PointerSample, eng: StudioEngine): void;
  cursor?: string;
}
