import type { Tool, PointerSample } from './Tool';
import type { StudioEngine } from '../engine';
import { rasterizeText } from '../text';

export class TextTool implements Tool {
  id = 'text' as const;

  onDown(e: PointerSample, eng: StudioEngine) {
    eng.addLayer('text', 'Text');
    const id = eng.doc.activeLayerId!;
    const td = {
      content: 'Text',
      fontFamily: 'Zen Kaku Gothic New, sans-serif',
      fontSize: 32,
      color: '#000000',
      bold: false,
      align: 'left' as const,
      vertical: false,
      x: e.x,
      y: e.y,
    };
    eng.setLayerText(id, td);
    eng.setBuffer(id, rasterizeText(td, eng.doc.width, eng.doc.height));
    eng.requestRender();
  }

  onMove() {}

  onUp() {}
}
