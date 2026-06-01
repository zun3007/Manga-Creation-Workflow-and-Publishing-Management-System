import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import type { RectN } from '../../lib/studio/types';
import { suggestMangaLayout } from '../../lib/studio/panels';
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

  const handleColorize = async () => {
    if (colorizing) return;
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

  // A blank/sketch page has no panel borders to "detect" — so we GENERATE a
  // manga-authentic layout (asymmetric gutters, RTL, varied panels) instead.
  const handleSuggestLayout = () => {
    const frames = suggestMangaLayout();
    onPanels(frames);
    toast.success(`Đã gợi ý bố cục ${frames.length} khung (manga) — xem viền đỏ trên canvas, rồi “Vẽ viền”.`);
  };

  return (
    <div className="p-4 border-t border-line space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">AI Assist</h3>
        <p className="text-xs text-ink-soft">
          Chạy hoàn toàn trong trình duyệt. Tô màu lần đầu cần tải mô hình nên hơi lâu — theo dõi thông báo ở góc phải.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleColorize}
          disabled={colorizing}
          className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          aria-label="AI colorize"
          aria-busy={colorizing}
        >
          {colorizing && <Spinner size={15} />}
          {colorizing ? 'Đang tô màu…' : 'AI tô màu'}
        </button>
        <button
          onClick={handleSuggestLayout}
          disabled={colorizing}
          className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="suggest manga panel layout"
        >
          Gợi ý bố cục khung
        </button>
      </div>
    </div>
  );
}
