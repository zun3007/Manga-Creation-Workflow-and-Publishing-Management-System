import { describe, it, expect } from 'vitest';
import { splitLines, rasterizeText } from './text';
import type { TextData } from './types';

describe('text', () => {
  it('splitLines splits on newlines', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('rasterizeText returns an RGBA buffer of w*h*4 (or empty if no 2D ctx)', () => {
    const td: TextData = {
      content: 'Hi',
      fontFamily: 'sans-serif',
      fontSize: 24,
      color: '#000',
      bold: false,
      align: 'left',
      vertical: false,
      x: 2,
      y: 2,
    };
    const buf = rasterizeText(td, 16, 16);
    expect(buf.length === 16 * 16 * 4 || buf.length === 0).toBe(true);
  });
});
