import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';

export interface ToneControlsProps {
  engine: StudioEngine;
}

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

function RangeSlider({ label, value, min, max, step, onChange, formatValue }: RangeSliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toFixed(0);
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-mono uppercase text-ink-soft flex-shrink-0 w-16">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="flex-1 h-1"
      />
      <span className="text-xs text-ink-soft flex-shrink-0 w-10 text-right">
        {displayValue}
      </span>
    </div>
  );
}

export function ToneControls({ engine }: ToneControlsProps) {
  const [cell, setCell] = useState(6);
  const [angleDeg, setAngleDeg] = useState(0);

  const handleApplyTone = () => {
    engine.applyTone(cell, angleDeg, { r: 0, g: 0, b: 0 });
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-surface border-b border-line">
      {/* Cell size slider */}
      <RangeSlider
        label="Cell"
        value={cell}
        min={2}
        max={16}
        step={1}
        onChange={setCell}
        formatValue={(val) => Math.round(val).toString()}
      />

      {/* Angle slider */}
      <RangeSlider
        label="Angle"
        value={angleDeg}
        min={0}
        max={90}
        step={1}
        onChange={setAngleDeg}
        formatValue={(val) => Math.round(val) + '°'}
      />

      {/* Info text */}
      <p className="text-xs text-ink-soft px-1">
        Tone reads layer alpha as ink density. Fill or brush first.
      </p>

      {/* Apply button */}
      <button
        onClick={handleApplyTone}
        className="px-3 py-2 bg-accent text-ink font-mono text-xs uppercase rounded hover:opacity-90 transition-opacity"
      >
        Apply Tone
      </button>
    </div>
  );
}
