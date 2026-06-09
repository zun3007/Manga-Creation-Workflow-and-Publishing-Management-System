import type { StudioEngine } from '../../lib/studio/engine';
import type { TextData } from '../../lib/studio/types';
import { rasterizeText } from '../../lib/studio/text';

export interface TextControlsProps {
  engine: StudioEngine;
  version: number;
}

export function TextControls({ engine }: TextControlsProps) {
  const activeId = engine.doc.activeLayerId;
  const activeLayer = activeId ? engine.doc.layers.find((l) => l.id === activeId) : null;

  if (!activeLayer || activeLayer.kind !== 'text' || !activeLayer.text) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-surface border-b border-line">
        <span className="text-xs text-ink-soft">Select a text layer to edit</span>
      </div>
    );
  }

  const td = activeLayer.text;
  const { width, height } = engine.doc;

  const handleChange = (updates: Partial<TextData>) => {
    const newTd: TextData = { ...td, ...updates };
    if (!activeId) return;
    engine.setLayerText(activeId, newTd);
    engine.setBuffer(activeId, rasterizeText(newTd, width, height));
    engine.requestRender();
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-surface border-b border-line">
      {/* Content textarea */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono uppercase text-ink-soft">Content</label>
        <textarea
          value={td.content}
          onChange={(e) => handleChange({ content: e.target.value })}
          className="px-2 py-2 bg-ink text-surface rounded border border-line font-mono text-xs"
          rows={3}
          aria-label="Text content"
        />
      </div>

      {/* Font family select */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono uppercase text-ink-soft">Font Family</label>
        <select
          value={td.fontFamily}
          onChange={(e) => handleChange({ fontFamily: e.target.value })}
          className="px-2 py-1 bg-ink text-surface rounded border border-line text-xs"
          aria-label="Font family"
        >
          <option value="sans-serif">Sans Serif</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
          <option value="Zen Kaku Gothic New, sans-serif">Zen Kaku Gothic New</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-mono uppercase text-ink-soft flex-shrink-0 w-16">
          Size
        </label>
        <input
          type="range"
          min={8}
          max={120}
          step={1}
          value={td.fontSize}
          onChange={(e) => handleChange({ fontSize: Number(e.target.value) })}
          aria-label="Font size"
          className="flex-1 h-1"
        />
        <span className="text-xs text-ink-soft flex-shrink-0 w-10 text-right">
          {td.fontSize}px
        </span>
      </div>

      {/* Bold toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={td.bold}
          onChange={(e) => handleChange({ bold: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="text-xs font-mono uppercase text-ink-soft">Bold</span>
      </label>

      {/* Alignment */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono uppercase text-ink-soft">Align</label>
        <select
          value={td.align}
          onChange={(e) => handleChange({ align: e.target.value as 'left' | 'center' | 'right' })}
          className="px-2 py-1 bg-ink text-surface rounded border border-line text-xs"
          aria-label="Text alignment"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Vertical toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={td.vertical}
          onChange={(e) => handleChange({ vertical: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="text-xs font-mono uppercase text-ink-soft">Vertical</span>
      </label>

      {/* Color */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono uppercase text-ink-soft">Color</label>
        <input
          type="color"
          value={td.color}
          onChange={(e) => handleChange({ color: e.target.value })}
          className="w-full h-10 rounded border border-line cursor-pointer"
          aria-label="Text color"
        />
      </div>
    </div>
  );
}
