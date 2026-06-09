import type { RGBA } from '../../lib/studio/types';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, MANGA_PALETTE } from '../../lib/studio/color';
import { Shuffle } from 'lucide-react';

export interface ColorPanelProps {
  colors: { fg: RGBA; bg: RGBA };
  onColors: (c: { fg: RGBA; bg: RGBA }) => void;
  activeColorSlot: 'fg' | 'bg';
  onActiveColorSlot: (slot: 'fg' | 'bg') => void;
  palette: string[];
  onAddSwatch: (hex: string) => void;
  recent: string[];
}

export function ColorPanel({
  colors,
  onColors,
  activeColorSlot,
  onActiveColorSlot,
  palette,
  onAddSwatch,
  recent,
}: ColorPanelProps) {
  const color = colors[activeColorSlot];
  const hex = rgbToHex({ r: color.r, g: color.g, b: color.b });
  const hsv = rgbToHsv({ r: color.r, g: color.g, b: color.b });

  const setActiveColor = (c: RGBA) => {
    onColors({ ...colors, [activeColorSlot]: c });
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val.startsWith('#') || val.length < 4) return;
    try {
      const rgb = hexToRgb(val);
      setActiveColor({ ...rgb, a: color.a });
    } catch {
      // ignore invalid hex
    }
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHsv = { h: Number(e.target.value), s: hsv.s, v: hsv.v };
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    setActiveColor({ ...rgb, a: color.a });
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHsv = { h: hsv.h, s: Number(e.target.value) / 100, v: hsv.v };
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    setActiveColor({ ...rgb, a: color.a });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHsv = { h: hsv.h, s: hsv.s, v: Number(e.target.value) / 100 };
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
    setActiveColor({ ...rgb, a: color.a });
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActiveColor({ ...color, a: Number(e.target.value) });
  };

  const handlePaletteSwatch = (swatchHex: string) => {
    const rgb = hexToRgb(swatchHex);
    setActiveColor({ ...rgb, a: color.a });
  };

  const handleAddSwatch = () => {
    onAddSwatch(hex);
  };

  const handleSwapColors = () => {
    onColors({ fg: colors.bg, bg: colors.fg });
  };

  const handleResetColors = () => {
    onColors({
      fg: { r: 0, g: 0, b: 0, a: 255 },
      bg: { r: 255, g: 255, b: 255, a: 255 },
    });
    onActiveColorSlot('fg');
  };

  const allSwatches = [
    ...MANGA_PALETTE,
    ...palette.filter((p) => !MANGA_PALETTE.includes(p)),
  ];

  return (
    <div className="flex flex-col gap-4 bg-surface border border-line rounded p-4">
      {/* Foreground/Background color swatches */}
      <div className="flex items-center gap-3">
        {/* FG swatch */}
        <button
          onClick={() => onActiveColorSlot('fg')}
          className={`relative w-14 h-14 rounded border-2 cursor-pointer transition-all ${
            activeColorSlot === 'fg' ? 'border-accent' : 'border-line'
          }`}
          style={{ backgroundColor: rgbToHex(colors.fg) }}
          aria-label="Foreground color"
          title="Foreground (X to swap)"
        />

        {/* BG swatch (overlapping slightly) */}
        <button
          onClick={() => onActiveColorSlot('bg')}
          className={`relative w-12 h-12 rounded border-2 cursor-pointer transition-all -ml-6 ${
            activeColorSlot === 'bg' ? 'border-accent' : 'border-line'
          }`}
          style={{ backgroundColor: rgbToHex(colors.bg) }}
          aria-label="Background color"
          title="Background (X to swap)"
        />

        {/* Swap and reset buttons */}
        <div className="flex flex-col gap-1 ml-1">
          <button
            onClick={handleSwapColors}
            className="p-1.5 hover:bg-surface-alt rounded transition-colors"
            aria-label="Swap colors"
            title="Swap FG/BG (X)"
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={handleResetColors}
            className="px-2 py-1 text-xs font-mono uppercase rounded hover:bg-surface-alt border border-line transition-colors"
            aria-label="Reset colors"
            title="Reset to black/white (D)"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Color input */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => {
            const rgb = hexToRgb(e.target.value);
            setActiveColor({ ...rgb, a: color.a });
          }}
          className="w-16 h-16 rounded border border-line cursor-pointer"
          aria-label="Color picker"
        />
        <div className="flex flex-col gap-2 flex-1">
          <input
            type="text"
            value={hex}
            onChange={handleHexChange}
            className="px-2 py-1 bg-ink text-surface rounded border border-line font-mono text-sm"
            aria-label="Hex color input"
            placeholder="#000000"
          />
          <button
            onClick={handleAddSwatch}
            className="px-3 py-1 bg-accent text-ink text-xs font-semibold rounded hover:opacity-80"
            aria-label="Add swatch"
          >
            Add Swatch
          </button>
        </div>
      </div>

      {/* HSV sliders */}
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono uppercase text-ink-soft w-12">H</label>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={hsv.h}
            onChange={handleHueChange}
            className="flex-1 h-1"
            aria-label="Hue"
          />
          <span className="text-xs text-ink-soft w-10 text-right">{Math.round(hsv.h)}°</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono uppercase text-ink-soft w-12">S</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(hsv.s * 100)}
            onChange={handleSaturationChange}
            className="flex-1 h-1"
            aria-label="Saturation"
          />
          <span className="text-xs text-ink-soft w-10 text-right">
            {Math.round(hsv.s * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono uppercase text-ink-soft w-12">V</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(hsv.v * 100)}
            onChange={handleValueChange}
            className="flex-1 h-1"
            aria-label="Value"
          />
          <span className="text-xs text-ink-soft w-10 text-right">
            {Math.round(hsv.v * 100)}%
          </span>
        </div>
      </div>

      {/* Alpha slider */}
      <div className="flex items-center gap-2 border-t border-line pt-3">
        <label className="text-xs font-mono uppercase text-ink-soft w-12">A</label>
        <input
          type="range"
          min="0"
          max="255"
          step="1"
          value={color.a}
          onChange={handleAlphaChange}
          className="flex-1 h-1"
          aria-label="Alpha"
        />
        <span className="text-xs text-ink-soft w-10 text-right">{color.a}</span>
      </div>

      {/* Palette grid */}
      <div className="border-t border-line pt-3">
        <p className="text-xs font-mono uppercase text-ink-soft mb-2">Palette</p>
        <div className="grid grid-cols-5 gap-2">
          {allSwatches.map((swatchHex) => (
            <button
              key={swatchHex}
              onClick={() => handlePaletteSwatch(swatchHex)}
              className="w-8 h-8 rounded border border-line hover:opacity-80 transition-opacity"
              style={{ backgroundColor: swatchHex }}
              aria-label={swatchHex}
              title={swatchHex}
            />
          ))}
        </div>
      </div>

      {/* Recent colors */}
      {recent.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs font-mono uppercase text-ink-soft mb-2">Recent</p>
          <div className="flex gap-2">
            {recent.map((recentHex) => (
              <button
                key={recentHex}
                onClick={() => handlePaletteSwatch(recentHex)}
                className="w-6 h-6 rounded border border-line hover:opacity-80 transition-opacity"
                style={{ backgroundColor: recentHex }}
                aria-label={recentHex}
                title={recentHex}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
