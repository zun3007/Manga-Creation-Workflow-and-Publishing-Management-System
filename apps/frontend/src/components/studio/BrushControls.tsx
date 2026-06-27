import type { BrushSettings } from '../../lib/studio/types';

export interface BrushControlsProps {
  settings: BrushSettings;
  onChange: (s: BrushSettings) => void;
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
  const displayValue = formatValue ? formatValue(value) : value.toFixed(2);
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

interface CheckboxToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxToggle({ label, checked, onChange }: CheckboxToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-xs font-mono uppercase text-ink-soft">{label}</span>
    </label>
  );
}

export function BrushControls({ settings, onChange }: BrushControlsProps) {
  const handleChange = (key: keyof BrushSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="flex flex-col gap-3 p-3 bg-surface border-b border-line">
      {/* Size slider */}
      <RangeSlider
        label="Size"
        value={settings.size}
        min={1}
        max={200}
        step={1}
        onChange={(val) => handleChange('size', val)}
        formatValue={(val) => Math.round(val).toString()}
      />

      {/* Opacity slider */}
      <RangeSlider
        label="Opacity"
        value={settings.opacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(val) => handleChange('opacity', val)}
        formatValue={(val) => Math.round(val * 100) + '%'}
      />

      {/* Flow slider */}
      <RangeSlider
        label="Flow"
        value={settings.flow}
        min={0}
        max={1}
        step={0.01}
        onChange={(val) => handleChange('flow', val)}
        formatValue={(val) => Math.round(val * 100) + '%'}
      />

      {/* Hardness slider */}
      <RangeSlider
        label="Hardness"
        value={settings.hardness}
        min={0}
        max={1}
        step={0.01}
        onChange={(val) => handleChange('hardness', val)}
        formatValue={(val) => Math.round(val * 100) + '%'}
      />

      {/* Spacing slider */}
      <RangeSlider
        label="Spacing"
        value={settings.spacing}
        min={0.02}
        max={1}
        step={0.01}
        onChange={(val) => handleChange('spacing', val)}
        formatValue={(val) => (val * 100).toFixed(0) + '%'}
      />

      {/* Stabilize slider */}
      <RangeSlider
        label="Stabilize"
        value={settings.stabilize}
        min={0}
        max={0.95}
        step={0.01}
        onChange={(val) => handleChange('stabilize', val)}
        formatValue={(val) => (val * 100).toFixed(0) + '%'}
      />

      {/* Pressure toggles */}
      <div className="border-t border-line/30 pt-3 space-y-2">
        <CheckboxToggle
          label="Pressure Size"
          checked={settings.pressureSize}
          onChange={(val) => handleChange('pressureSize', val)}
        />
        <CheckboxToggle
          label="Pressure Opacity"
          checked={settings.pressureOpacity}
          onChange={(val) => handleChange('pressureOpacity', val)}
        />
      </div>
    </div>
  );
}
