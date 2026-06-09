import type { ToolId } from '../../lib/studio/types';

interface ToolOptionsProps {
  tool: ToolId;
  tolerance: number;
  onToleranceChange: (value: number) => void;
  bubbleType: 'round' | 'spiky' | 'thought';
  onBubbleTypeChange: (type: 'round' | 'spiky' | 'thought') => void;
  lineWidth: number;
  onLineWidthChange: (value: number) => void;
}

export function ToolOptions({
  tool,
  tolerance,
  onToleranceChange,
  bubbleType,
  onBubbleTypeChange,
  lineWidth,
  onLineWidthChange,
}: ToolOptionsProps) {
  return (
    <div className="border-b border-line p-4">
      <div className="text-xs font-mono uppercase text-ink-soft mb-3">
        Tool Options
      </div>

      {(tool === 'bucket' || tool === 'wand') && (
        <div className="flex flex-col gap-2">
          <label htmlFor="tolerance-slider" className="text-xs text-ink-soft">
            Tolerance: {tolerance}
          </label>
          <input
            id="tolerance-slider"
            type="range"
            min="0"
            max="128"
            step="1"
            value={tolerance}
            onChange={(e) => onToleranceChange(parseInt(e.target.value, 10))}
            className="w-full cursor-pointer"
            aria-label="tolerance"
          />
        </div>
      )}

      {tool === 'bubble' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="bubble-type-select" className="text-xs text-ink-soft">
            Bubble Type
          </label>
          <select
            id="bubble-type-select"
            value={bubbleType}
            onChange={(e) =>
              onBubbleTypeChange(e.target.value as 'round' | 'spiky' | 'thought')
            }
            className="w-full px-2 py-1 text-xs bg-surface border border-line rounded text-ink"
          >
            <option value="round">Round</option>
            <option value="spiky">Spiky</option>
            <option value="thought">Thought</option>
          </select>
        </div>
      )}

      {tool === 'line' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="line-width-slider" className="text-xs text-ink-soft">
            Line Width: {lineWidth}
          </label>
          <input
            id="line-width-slider"
            type="range"
            min="1"
            max="20"
            step="1"
            value={lineWidth}
            onChange={(e) => onLineWidthChange(parseInt(e.target.value, 10))}
            className="w-full cursor-pointer"
            aria-label="line width"
          />
        </div>
      )}
    </div>
  );
}
