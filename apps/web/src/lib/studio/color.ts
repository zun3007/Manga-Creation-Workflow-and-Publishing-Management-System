export interface RGB { r: number; g: number; b: number }

export interface HSV { h: number; s: number; v: number }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const mx = Math.max(r1, g1, b1);
  const mn = Math.min(r1, g1, b1);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r1) h = ((g1 - b1) / d) % 6;
    else if (mx === g1) h = (b1 - r1) / d + 2;
    else h = (r1 - g1) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: mx ? d / mx : 0, v: mx };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export const MANGA_PALETTE = [
  '#000000',
  '#ffffff',
  '#e58a86',
  '#a8c8e0',
  '#f4d35e',
  '#6b8f71',
  '#7d5ba6',
  '#c47e54',
  '#3e454c',
  '#d0746b',
];
