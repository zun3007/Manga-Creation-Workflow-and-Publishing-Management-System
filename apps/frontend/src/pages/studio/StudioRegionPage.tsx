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
import type { TaskItem } from '../../types';
import type { RectN } from '../../lib/studio/types';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { draftKey, saveDraft, loadDraft, getDraftMeta, clearDraft } from '../../lib/studio/persist';

export default function StudioRegionPage() {
  const { taskId } = useParams<{ taskId: string }>(); const id = Number(taskId);
  const navigate = useNavigate(); const location = useLocation(); const { user } = useAuth();
  const toast = useToast(); const { confirm } = useConfirm();
  const [engine, setEngine] = useState<StudioEngine | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [taskInfo, setTaskInfo] = useState<TaskItem | null>(null);
  const [ai, setAi] = useState<AIAssist | null>(null);
  const [aiKind, setAiKind] = useState<'ONNX' | 'Heuristic'>('Heuristic');
  const autosaveTimerRef = useRef<number | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  function taskRegion(task: TaskItem): RectN | null {
    const region = {
      x: Number(task.regionX),
      y: Number(task.regionY),
      width: Number(task.regionWidth),
      height: Number(task.regionHeight),
    };

    if (
      !Object.values(region).every(Number.isFinite) ||
      region.width <= 0 ||
      region.height <= 0
    ) {
      return null;
    }

    return region;
  }

  useEffect(() => { let alive = true; (async () => {
    try {
      const wasm = await InkforgeWasm.load(wasmUrl);
      let task: TaskItem | undefined = (location.state as any)?.task;
      if (!task) { const { data } = await api.get<TaskItem[]>('/tasks/mine'); task = data.find(t => t.id === id); }
      if (!task?.pageId) throw new Error('Task này chưa gắn trang để mở Studio.');
      if (!taskRegion(task)) throw new Error('Task này chưa có tọa độ vùng được giao.');
      if (alive) setTaskInfo(task);
      let documentWidth = 1000;
      let documentHeight = 1414;
      let pageImage: HTMLImageElement | null = null;

      if (task.pageImage) {
        try {
          pageImage = await loadImageFromBlob(
            await (await fetch(task.pageImage)).blob(),
          );
          documentWidth = pageImage.naturalWidth || documentWidth;
          documentHeight = pageImage.naturalHeight || documentHeight;
        } catch (imageError) {
          console.warn('[StudioRegionPage] Page image unavailable', imageError);
        }
      }

      const doc = createDocument({
        width: documentWidth,
        height: documentHeight,
        background: 'white',
      });
      let eng = new StudioEngine(doc, wasm);

      if (pageImage) {
        eng.setBuffer(
          doc.activeLayerId!,
          imageToBuffer(
            pageImage,
            documentWidth,
            documentHeight,
            documentWidth,
            documentHeight,
          ),
        );
      }

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
            const result = await deserializeDoc(draft.manifest as any, wasm);
            const draftMatchesSource =
              result.engine.doc.width === documentWidth &&
              result.engine.doc.height === documentHeight;

            if (draftMatchesSource) {
              eng = result.engine;
              if (result.warnings?.length) {
                console.warn('[StudioRegionPage] Draft layer load warnings:', result.warnings);
              }
            } else {
              toast.info(
                'Bản nháp cũ dùng kích thước canvas không tương thích nên chưa được khôi phục.',
              );
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
    if (!engine) return; setSaving(true);
    if (!taskInfo?.pageId) {
      setSaving(false);
      toast.error('Task này chưa gắn trang để lưu Studio.');
      return;
    }
    const tid = toast.loading('Đang lưu Studio và nộp bài…');
    try {
      const blob = await exportPNG(engine); const fd = new FormData(); fd.append('file', new File([blob], `task-${id}.png`, { type: 'image/png' }));
      const { data } = await api.post<{ url: string }>('/uploads', fd);
      await api.post('/studio/page-versions', { pageId: taskInfo.pageId, imageUrl: data.url });
      const { manifest, blobs } = await serializeDoc(engine);
      for (const [lid, layerBlob] of Object.entries(blobs)) {
        const layerFd = new FormData();
        layerFd.append('file', new File([layerBlob], `task-${id}-${lid}.png`, { type: 'image/png' }));
        const layerRes = await api.post<{ url: string }>('/uploads', layerFd);
        manifest.layerImages[lid] = layerRes.data.url;
      }
      await api.post('/studio/docs', { pageId: taskInfo.pageId, manifest });
      await api.post('/submissions', { taskId: id });
      engine.markSaved();
      const key = draftKey('task', id);
      await clearDraft(key);
      toast.update(tid, 'success', 'Đã nộp bài.');
      navigate('/my-tasks');
    } catch (e) { console.error(e); toast.update(tid, 'error', 'Nộp bài thất bại. Thử lại nhé.'); } finally { setSaving(false); }
  }

  if (error) return <div className="grid h-screen place-items-center bg-bg text-ink"><div className="flex flex-col items-center gap-3 text-center"><p className="text-sm text-danger">{error}</p><button onClick={() => navigate('/my-tasks')} className="px-4 py-2 text-xs uppercase tracking-wide rounded bg-accent text-ink">Quay lại</button></div></div>;
  if (!engine || !ai) return <div className="grid h-screen place-items-center bg-bg text-ink"><div className="flex flex-col items-center gap-3 text-ink-soft"><Spinner size={28} className="text-accent" /><span className="font-mono text-xs uppercase tracking-wider">Đang mở Studio…</span></div></div>;
  const assignedRegion = taskInfo ? taskRegion(taskInfo) : null;
  return <div data-role={user ? roleScope(user.role) : 'assistant'} className="h-screen w-screen overflow-hidden bg-bg">
    <Studio engine={engine} ai={ai} aiKind={aiKind} assignedRegion={assignedRegion ?? undefined} onSave={onSave} onClose={() => navigate('/my-tasks')} saving={saving} title={`Việc #${id} · ${taskInfo?.regionType ?? 'Vùng được giao'}`} />
  </div>;
}
