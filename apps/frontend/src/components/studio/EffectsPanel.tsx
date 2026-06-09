import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import { focusLines, speedLines, drawLines } from '../../lib/studio/lines';
import { useToast } from '../ui/Toast';

export interface EffectsPanelProps {
  engine: StudioEngine;
}

export function EffectsPanel({ engine }: EffectsPanelProps) {
  const toast = useToast();
  const [density, setDensity] = useState(90);
  const [angle, setAngle] = useState(0);

  // Focal point = centroid of the current selection, else the page centre.
  const focalPoint = () => {
    const W = engine.doc.width, H = engine.doc.height;
    const m = engine.selectionMask;
    if (m) {
      let sx = 0, sy = 0, n = 0;
      for (let p = 0; p < m.length; p++) if (m[p]) { sx += p % W; sy += (p / W) | 0; n++; }
      if (n) return { x: sx / n, y: sy / n };
    }
    return { x: W / 2, y: H / 2 };
  };

  const newLayer = (name: string) => {
    engine.addLayer('raster', name);
    return engine.doc.activeLayerId;
  };

  const addFocus = () => {
    const W = engine.doc.width, H = engine.doc.height;
    const { x, y } = focalPoint();
    const segs = focusLines(x, y, density, Math.hypot(W, H) * 0.78, Math.min(W, H) * 0.15);
    const id = newLayer('集中線 (focus)');
    if (!id) return;
    drawLines(engine.getBuffer(id), W, H, segs);
    engine.requestRender();
    toast.success('Đã tạo tuyến tập trung (集中線) — layer mới.');
  };

  const addSpeed = () => {
    const W = engine.doc.width, H = engine.doc.height;
    const spacing = Math.max(3, Math.min(W, H) / density);
    const segs = speedLines(angle, density, spacing, W, H);
    const id = newLayer('流線 (speed)');
    if (!id) return;
    drawLines(engine.getBuffer(id), W, H, segs);
    engine.requestRender();
    toast.success('Đã tạo đường tốc độ (流線) — layer mới.');
  };

  return (
    <div className="p-4 space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-ink">Hiệu ứng manga</h3>
        <p className="text-xs text-ink-soft">
          集中線 hội tụ về tâm vùng chọn (hoặc giữa trang); 流線 quét theo góc. Mỗi lần tạo một layer riêng để dễ chỉnh.
        </p>
      </div>

      <label className="block text-xs font-mono uppercase text-ink-soft">Mật độ tia: {density}</label>
      <input type="range" min={20} max={200} step={5} value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-full" aria-label="Line density" />
      <button onClick={addFocus} className="w-full px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity">
        Tạo 集中線 (tập trung)
      </button>

      <label className="block text-xs font-mono uppercase text-ink-soft pt-1">Góc 流線: {angle}°</label>
      <input type="range" min={0} max={180} step={5} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full" aria-label="Speed line angle" />
      <button onClick={addSpeed} className="w-full px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity">
        Tạo 流線 (tốc độ)
      </button>
    </div>
  );
}
