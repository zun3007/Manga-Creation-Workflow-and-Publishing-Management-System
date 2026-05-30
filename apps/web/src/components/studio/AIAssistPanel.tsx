import type { StudioEngine } from '../../lib/studio/engine';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import type { RectN } from '../../lib/studio/types';

export interface AIAssistPanelProps {
  engine: StudioEngine;
  ai: AIAssist;
  onPanels: (frames: RectN[]) => void;
}

export function AIAssistPanel({ engine, ai, onPanels }: AIAssistPanelProps) {
  const handleColorize = () => {
    ai.colorize(engine);
  };

  const handleDetectPanels = () => {
    const composite = engine.composite();
    const w = engine.doc.width;
    const h = engine.doc.height;
    const panels = ai.detectPanels(composite, w, h);
    onPanels(panels);
  };

  return (
    <div className="p-4 border-t border-line space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">AI Assist</h3>
        <p className="text-xs text-ink-soft">
          Heuristic MVP — a real model can be plugged in behind the AIAssist interface with no UI change.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleColorize}
          className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity"
          aria-label="AI colorize"
        >
          AI tô màu
        </button>
        <button
          onClick={handleDetectPanels}
          className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity"
          aria-label="AI detect panels"
        >
          Chia khung tự động
        </button>
      </div>
    </div>
  );
}
