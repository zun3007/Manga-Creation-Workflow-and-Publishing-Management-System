import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from './color';

describe('color conversions', () => {
  it('hex <-> rgb round-trips', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe('#ff8000');
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('rgb -> hsv for primary red', () => {
    const hsv = rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(hsv.h).toBeCloseTo(0);
    expect(hsv.s).toBeCloseTo(1);
    expect(hsv.v).toBeCloseTo(1);
  });
  it('hsv -> rgb round-trips a mid color', () => {
    const rgb = hsvToRgb(210, 0.5, 0.8);
    const back = rgbToHsv(rgb);
    expect(back.h).toBeCloseTo(210, 0);
    expect(back.v).toBeCloseTo(0.8, 1);
  });
});
