import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { RGBA } from '../../lib/studio/types';
import { radialLines, parallelLines } from '../../lib/studio/lines';

export interface MangaRulersProps {
  engine: StudioEngine;
  color: RGBA;
  version: number;
}

export function MangaRulers({ engine, color }: MangaRulersProps) {
  const [symmetry, setSymmetry] = useState<'none' | 'vertical' | 'horizontal'>('none');

  const handleSymmetryChange = (mode: 'none' | 'vertical' | 'horizontal') => {
    setSymmetry(mode);
    engine.setSymmetry(mode);
  };

  const handleRadialFocusLines = () => {
    const w = engine.doc.width;
    const h = engine.doc.height;
    engine.strokeLines(radialLines(w / 2, h / 2, 48, Math.hypot(w, h)), color, 2);
  };

  const handleSpeedLines = () => {
    const w = engine.doc.width;
    const h = engine.doc.height;
    engine.strokeLines(parallelLines(0, 60, 6, w, h), color, 1);
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-surface border-b border-line">
      {/* Symmetry mode selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono uppercase text-ink-soft">Symmetry</label>
        <div className="flex gap-2">
          {(['none', 'vertical', 'horizontal'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSymmetryChange(mode)}
              className={`flex-1 px-2 py-1 text-xs font-mono uppercase rounded transition-all ${
                symmetry === mode
                  ? 'bg-accent text-ink'
                  : 'bg-inactive text-ink-soft hover:bg-ink-lighter'
              }`}
            >
              {mode === 'none' ? 'None' : mode === 'vertical' ? 'V' : 'H'}
            </button>
          ))}
        </div>
      </div>

      {/* Focus lines buttons */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono uppercase text-ink-soft">Guides</label>
        <div className="flex gap-2">
          <button
            onClick={handleRadialFocusLines}
            className="flex-1 px-3 py-2 bg-accent text-ink font-mono text-xs uppercase rounded hover:opacity-90 transition-opacity"
          >
            Radial Focus
          </button>
          <button
            onClick={handleSpeedLines}
            className="flex-1 px-3 py-2 bg-accent text-ink font-mono text-xs uppercase rounded hover:opacity-90 transition-opacity"
          >
            Speed Lines
          </button>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-ink-soft px-1">
        Symmetry mode ready. Click guides to stamp focus or speed lines.
      </p>
    </div>
  );
}
