import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import type { RectN } from '../../lib/studio/types';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';

export interface AIAssistPanelProps {
  engine: StudioEngine;
  ai: AIAssist;
  onPanels: (frames: RectN[]) => void;
}

export function AIAssistPanel({ engine, ai, onPanels }: AIAssistPanelProps) {
  const toast = useToast();
  const [colorizing, setColorizing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const busy = colorizing || detecting;

  const handleColorize = async () => {
    if (busy) return;
    setColorizing(true);
    const tid = toast.loading('AI đang tô màu… (lần đầu cần tải mô hình nên hơi lâu)');
    try {
      await ai.colorize(engine);
      engine.requestRender?.();
      toast.update(tid, 'success', 'AI đã tô màu xong.');
    } catch (err) {
      console.warn('[AIAssistPanel] colorize error:', err);
      toast.update(tid, 'error', 'Tô màu thất bại. Thử lại nhé.');
    } finally {
      setColorizing(false);
    }
  };

  const handleDetectPanels = async () => {
    if (busy) return;
    setDetecting(true);
    const tid = toast.loading('AI đang phân tích & chia khung…');
    try {
      const composite = engine.composite();
      const panels = (await ai.detectPanels(composite, engine.doc.width, engine.doc.height)) ?? [];
      onPanels(panels);
      toast.update(
        tid,
        panels.length ? 'success' : 'info',
        panels.length ? `Đã nhận diện ${panels.length} khung.` : 'Không tìm thấy khung nào.',
      );
    } catch (err) {
      console.warn('[AIAssistPanel] detectPanels error:', err);
      toast.update(tid, 'error', 'Chia khung thất bại. Thử lại nhé.');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="p-4 border-t border-line space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">AI Assist</h3>
        <p className="text-xs text-ink-soft">
          Chạy hoàn toàn trong trình duyệt (ONNX/heuristic). Lần đầu có thể tải mô hình nên hơi lâu —
          theo dõi thông báo ở góc phải.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleColorize}
          disabled={busy}
          className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          aria-label="AI colorize"
          aria-busy={colorizing}
        >
          {colorizing && <Spinner size={15} />}
          {colorizing ? 'Đang tô màu…' : 'AI tô màu'}
        </button>
        <button
          onClick={handleDetectPanels}
          disabled={busy}
          className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          aria-label="AI detect panels"
          aria-busy={detecting}
        >
          {detecting && <Spinner size={15} />}
          {detecting ? 'Đang chia khung…' : 'Chia khung tự động'}
        </button>
      </div>
    </div>
  );
}
