import { describe, it, expect } from 'vitest';
import { drawBubble } from './bubbles';

describe('drawBubble', () => {
  it('fills white center with a dark ring (round)', () => {
    const w = 40, h = 40;
    const buf = new Uint8ClampedArray(w * h * 4);
    drawBubble(buf, w, h, 'round', { x: 5, y: 5, width: 30, height: 24 }, { x: 20, y: 38 });
    const c = ((17) * w + 20) * 4; // near center
    expect(buf[c + 3]).toBe(255); // opaque
    expect(buf[c]).toBe(255); // white center
    // an edge pixel somewhere is black
    let blackFound = false;
    for (let i = 0; i < buf.length; i += 4) {
      if (buf[i] === 0 && buf[i + 3] === 255) {
        blackFound = true;
        break;
      }
    }
    expect(blackFound).toBe(true);
  });
});
