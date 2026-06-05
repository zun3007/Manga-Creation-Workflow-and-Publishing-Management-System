import { useEffect, useRef, useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import type { RectN } from '../../lib/studio/types';
import { suggestMangaLayout } from '../../lib/studio/panels';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import { disposeSamWorker } from '../../lib/studio/ai/onnx/samClient';
import { disposeColorizeWorker } from '../../lib/studio/ai/onnx/colorizeClient';

export interface AIAssistPanelProps {
  engine: StudioEngine;
  ai: AIAssist;
  onPanels: (frames: RectN[]) => void;
}

export function AIAssistPanel({ engine, ai, onPanels }: AIAssistPanelProps) {
  const toast = useToast();
  const [colorizing, setColorizing] = useState(false);
  const colorizeControllerRef = useRef<AbortController | null>(null);
  const [isHeuristicFallback, setIsHeuristicFallback] = useState(false);

  // Cleanup workers on unmount
  useEffect(() => {
    return () => {
      disposeSamWorker();
      disposeColorizeWorker();
    };
  }, []);

  // Check if we're using heuristic fallback by checking model availability
  useEffect(() => {
    const checkFallback = async () => {
      try {
        const { MODELS } = await import('../../lib/studio/ai/onnx/models');
        const { modelExists: checkModel } = await import('../../lib/studio/ai/onnx/available');
        const hasColorizeModel = await checkModel(MODELS.colorize);
        setIsHeuristicFallback(!hasColorizeModel);
      } catch {
        setIsHeuristicFallback(true);
      }
    };
    checkFallback();
  }, []);

  const handleColorize = async () => {
    if (colorizing) return;
    setColorizing(true);
    const controller = new AbortController();
    colorizeControllerRef.current = controller;

    const toastId = toast.loading('Đang chạy AI…');

    try {
      await ai.colorize(engine, controller.signal);
      engine.requestRender?.();
      toast.update(toastId, 'success', 'AI đã tô màu xong.');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled — clear the loading toast quietly, no error.
        toast.dismiss(toastId);
      } else {
        console.warn('[AIAssistPanel] colorize error:', err);
        const msg = err?.message?.includes('timeout') ? 'Tô màu quá lâu. Thử lại nhé.' : 'Tô màu thất bại. Thử lại nhé.';
        toast.update(toastId, 'error', msg);
      }
    } finally {
      setColorizing(false);
      colorizeControllerRef.current = null;
    }
  };

  const handleCancelColorize = () => {
    colorizeControllerRef.current?.abort();
  };

  // A blank/sketch page has no panel borders to “detect” — so we GENERATE a
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
        {isHeuristicFallback && (
          <p className="text-xs text-ink-soft bg-bg border border-line p-2 rounded">
            Dùng AI nội bộ (chưa cài mô hình ONNX).
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {colorizing ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded border border-line">
            <Spinner size={15} />
            <span className="text-sm font-medium text-ink flex-1">Đang chạy AI…</span>
            <button
              onClick={handleCancelColorize}
              className="px-2 py-1 text-xs font-medium bg-danger text-white rounded hover:brightness-95 transition"
              aria-label="Huỷ AI"
            >
              Huỷ
            </button>
          </div>
        ) : (
          <button
            onClick={handleColorize}
            className="px-3 py-2 text-sm font-medium bg-accent text-ink rounded hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
            aria-label="AI colorize"
          >
            AI tô màu
          </button>
        )}
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
