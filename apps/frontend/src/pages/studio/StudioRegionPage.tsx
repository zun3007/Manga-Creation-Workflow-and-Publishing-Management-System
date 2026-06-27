import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import wasmUrl from '@manga/canvas-wasm/inkforge.wasm?url';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { api } from '../../lib/api';
import { roleScope } from '@manga/shared';
import { useAuth } from '../../lib/auth';
import { useConfirm } from '../../lib/confirm';
import { Studio } from '../../components/studio/Studio';
import { StudioEngine } from '../../lib/studio/engine';
import { HeuristicAI } from '../../lib/studio/ai/heuristic';
import { modelExists } from '../../lib/studio/ai/onnx/available';
import { MODELS } from '../../lib/studio/ai/onnx/models';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import { createDocument } from '../../lib/studio/document';
import { loadImageFromBlob, imageToBuffer, exportPNG, serializeDoc, deserializeDoc } from '../../lib/studio/io';
import type { LayerDocManifest, RectN } from '../../lib/studio/types';
import type { TaskItem } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { draftKey, saveDraft, loadDraft, getDraftMeta, clearDraft } from '../../lib/studio/persist';

export default function StudioRegionPage() {
  const { taskId } = useParams<{ taskId: string }>(); const id = Number(taskId);
  const navigate = useNavigate(); const location = useLocation(); const { user } = useAuth();
  const toast = useToast(); const { confirm } = useConfirm();
  const [engine, setEngine] = useState<StudioEngine | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [ai, setAi] = useState<AIAssist | null>(null);
  const [aiKind, setAiKind] = useState<'ONNX' | 'Heuristic'>('Heuristic');
  const [regionGuide, setRegionGuide] = useState<RectN | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => { let alive = true; (async () => {
    try {
      const wasm = await InkforgeWasm.load(wasmUrl);
      let task: TaskItem | undefined = (location.state as { task?: TaskItem } | null)?.task;
      if (!task) { const { data } = await api.get<TaskItem[]>('/tasks/mine'); task = data.find(t => t.id === id); }
      // Build the assigned-region guide (normalized 0..1) so the assistant sees exactly where to draw.
      const rx = Number(task?.regionX), ry = Number(task?.regionY), rw = Number(task?.regionWidth), rh = Number(task?.regionHeight);
      const guide: RectN | null =
        task && [rx, ry, rw, rh].every((v) => Number.isFinite(v)) && rw > 0 && rh > 0
          ? { x: rx, y: ry, width: rw, height: rh }
          : null;
      const w = 1000, h = 1414; const doc = createDocument({ width: w, height: h, background: 'white' });
      let eng = new StudioEngine(doc, wasm);
      if (task?.pageImage) { try { const img = await loadImageFromBlob(await (await fetch(task.pageImage)).blob()); eng.setBuffer(doc.activeLayerId!, imageToBuffer(img, img.naturalWidth, img.naturalHeight, w, h)); } catch { /* draw on blank */ } }

      // Check for draft restore
      const key = draftKey('task', id);
      const draftMeta = await getDraftMeta(key);
      if (draftMeta) {
        const shouldRestore = await confirm({
          title: 'Khôi phục bản nháp chưa lưu?',
          body: `Có một bản nháp cục bộ lúc ${new Date(draftMeta.savedAt).toLocaleString('vi-VN')}. Khôi phục?`,
          confirmText: 'Khôi phục',
          cancelText: 'Bỏ qua',
        });
        if (shouldRestore) {
          const draft = await loadDraft(key);
          if (draft && draft.manifest) {
            const result = await deserializeDoc(draft.manifest as LayerDocManifest, wasm);
            eng = result.engine;
            if (result.warnings?.length) {
              console.warn('[StudioRegionPage] Draft layer load warnings:', result.warnings);
            }
          }
        } else {
          await clearDraft(key);
        }
      }

      // Select AI based on model availability
      const hasModel = await modelExists(MODELS.panels);
      let selectedAi: AIAssist;
      if (hasModel) { const { OnnxAI } = await import('../../lib/studio/ai/onnx/OnnxAI'); selectedAi = new OnnxAI(); }
      else { selectedAi = new HeuristicAI(); }
      if (alive) {
        setEngine(eng);
        setAi(selectedAi);
        setAiKind(hasModel ? 'ONNX' : 'Heuristic');
        setRegionGuide(guide);
      }
    } catch (e) { console.error(e); if (alive) setError('Không mở được Studio.'); }
  })(); return () => { alive = false; }; }, [id, confirm]);

  // Autosave effect: subscribe to engine changes and debounce saves
  useEffect(() => {
    if (!engine) return;
    const key = draftKey('task', id);

    const debounceAutosave = () => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = window.setTimeout(async () => {
        if (engine.isDirty()) {
          try {
            const { manifest, blobs } = await serializeDoc(engine);
            await saveDraft(key, { manifest, blobs });
          } catch (e) {
            console.error('[StudioRegionPage] autosave error:', e);
          }
        }
        autosaveTimerRef.current = null;
      }, 4000);
    };

    const unsub = engine.onChange(debounceAutosave);
    unsubscribeRef.current = unsub;

    return () => {
      if (autosaveTimerRef.current !== null) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [engine, id]);

  async function onSave() {
    if (!engine) return;
    // The button is an explicit SUBMIT — confirm so it never auto-submits by
    // surprise. The working draft is autosaved locally, so "Để sau" is safe.
    const okSubmit = await confirm({
      title: 'Nộp bài cho Mangaka?',
      body: 'Bản vẽ hiện tại sẽ được nộp để Mangaka duyệt. Bản nháp được tự động lưu — bạn có thể tiếp tục chỉnh sửa trước khi nộp.',
      confirmText: 'Nộp bài',
      cancelText: 'Để sau',
    });
    if (!okSubmit) return;
    setSaving(true);
    const tid = toast.loading('Đang nộp bài…');
    try {
      const blob = await exportPNG(engine); const fd = new FormData(); fd.append('file', new File([blob], `task-${id}.png`, { type: 'image/png' }));
      const { data } = await api.post<{ url: string }>('/uploads', fd);
      await api.post('/submissions', { taskId: id, fileUrl: data.url });
      engine.markSaved();
      const key = draftKey('task', id);
      await clearDraft(key);
      toast.update(tid, 'success', 'Đã nộp bài.');
      navigate('/my-tasks');
    } catch (e) { console.error(e); toast.update(tid, 'error', 'Nộp bài thất bại. Thử lại nhé.'); } finally { setSaving(false); }
  }

  if (error) return <div className="grid h-screen place-items-center bg-bg text-ink"><div className="flex flex-col items-center gap-3 text-center"><p className="text-sm text-danger">{error}</p><button onClick={() => navigate('/my-tasks')} className="px-4 py-2 text-xs uppercase tracking-wide rounded bg-accent text-ink">Quay lại</button></div></div>;
  if (!engine || !ai) return <div className="grid h-screen place-items-center bg-bg text-ink"><div className="flex flex-col items-center gap-3 text-ink-soft"><Spinner size={28} className="text-accent" /><span className="font-mono text-xs uppercase tracking-wider">Đang mở Studio…</span></div></div>;
  return <div data-role={user ? roleScope(user.role) : 'assistant'} className="h-screen w-screen overflow-hidden bg-bg">
    <Studio engine={engine} ai={ai} aiKind={aiKind} onSave={onSave} onClose={() => navigate('/my-tasks')} saving={saving} title={`Việc #${id}`} saveLabel="Nộp bài" regionGuide={regionGuide} />
  </div>;
}
