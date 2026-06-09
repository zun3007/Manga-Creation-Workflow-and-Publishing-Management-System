import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { RectN } from '../../lib/studio/types';
import { MANGA_LAYOUTS, buildLayout, type MangaLayout } from '../../lib/studio/panels';

export interface PanelToolsProps {
  engine: StudioEngine;
  onFrames: (frames: RectN[]) => void;
}

export function PanelTools({ onFrames }: PanelToolsProps) {
  const [gutter, setGutter] = useState(0.016);

  const preview = (layout: MangaLayout) => {
    // Show the layout as a non-destructive overlay; the user inks/saves from the top bar.
    onFrames(buildLayout(layout, { gv: gutter, gh: gutter * 2.8 }));
  };

  return (
    <div className="p-4 border-t border-line space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Bố cục khung (manga)</h3>
        <p className="text-xs text-ink-soft">
          Lề dọc hẹp, lề ngang rộng, đọc phải → trái. Chọn mẫu để xem khung (viền đỏ trên canvas), rồi “Vẽ viền” / “Lưu khung”.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MANGA_LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => preview(l)}
              title={l.label}
              className="px-2 py-1.5 text-left text-xs bg-surface text-ink border border-line rounded hover:border-accent hover:text-accent transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-ink">
          Khoảng cách lề: {(gutter * 100).toFixed(1)}%
        </label>
        <input
          type="range"
          min={0.006}
          max={0.04}
          step={0.002}
          value={gutter}
          onChange={(e) => setGutter(Number(e.target.value))}
          className="w-full"
          aria-label="Panel gutter"
        />
      </div>
    </div>
  );
}
