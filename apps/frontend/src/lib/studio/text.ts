import type { TextData } from './types';

export function splitLines(content: string): string[] {
  return content.split('\n');
}

export function rasterizeText(td: TextData, w: number, h: number): Uint8ClampedArray {
  if (typeof document === 'undefined') return new Uint8ClampedArray(0);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return new Uint8ClampedArray(w * h * 4);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = td.color;
  ctx.textBaseline = 'top';
  ctx.font = `${td.bold ? 'bold ' : ''}${td.fontSize}px ${td.fontFamily}`;

  if (td.vertical) {
    let y = td.y;
    for (const ch of td.content) {
      if (ch === '\n') {
        y = td.y;
        continue;
      }
      ctx.fillText(ch, td.x, y);
      y += td.fontSize * 1.05;
    }
  } else {
    ctx.textAlign = td.align;
    let y = td.y;
    for (const ln of splitLines(td.content)) {
      ctx.fillText(ln, td.x, y);
      y += td.fontSize * 1.3;
    }
  }

  return ctx.getImageData(0, 0, w, h).data;
}
