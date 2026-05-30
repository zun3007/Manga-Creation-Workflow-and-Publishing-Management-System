import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { RectN } from '../../lib/studio/types';
import { templateFrames, drawFrameBorders, type PanelTemplate } from '../../lib/studio/panels';

export interface PanelToolsProps {
  engine: StudioEngine;
  onFrames: (frames: RectN[]) => void;
}

const templates: PanelTemplate[] = ['1', '2row', '3row', '4koma', '2col', '2x2', '3x2'];

export function PanelTools({ engine, onFrames }: PanelToolsProps) {
  const [gutter, setGutter] = useState(0.02);

  const applyTemplate = (t: PanelTemplate) => {
    engine.addLayer('raster', 'Frames');
    const active = engine.doc.activeLayerId;
    if (!active) return;

    const frames = templateFrames(t, gutter);
    const buf = engine.getBuffer(active);
    const w = engine.doc.width;
    const h = engine.doc.height;

    drawFrameBorders(buf, w, h, frames);
    engine.requestRender();
    onFrames(frames);
  };

  return (
    <div className="p-4 border-t border-line space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Panel Templates</h3>
        <div className="grid grid-cols-4 gap-2">
          {templates.map((t) => (
            <button
              key={t}
              onClick={() => applyTemplate(t)}
              className="px-2 py-1 text-xs font-mono bg-surface text-ink border border-line rounded hover:bg-accent transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink block">
          Gutter: {(gutter * 100).toFixed(1)}%
        </label>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.001}
          value={gutter}
          onChange={(e) => setGutter(Number(e.target.value))}
          className="w-full"
          aria-label="Panel gutter"
        />
      </div>
    </div>
  );
}
