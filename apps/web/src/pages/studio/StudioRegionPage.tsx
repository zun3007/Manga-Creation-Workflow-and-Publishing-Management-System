import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import wasmUrl from '@manga/canvas-wasm/inkforge.wasm?url';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { api } from '../../lib/api';
import { roleScope } from '@manga/shared';
import { useAuth } from '../../lib/auth';
import { Studio } from '../../components/studio/Studio';
import { StudioEngine } from '../../lib/studio/engine';
import { HeuristicAI } from '../../lib/studio/ai/heuristic';
import { modelExists } from '../../lib/studio/ai/onnx/available';
import { MODELS } from '../../lib/studio/ai/onnx/models';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import { createDocument } from '../../lib/studio/document';
import { loadImageFromBlob, imageToBuffer, exportPNG } from '../../lib/studio/io';
import type { TaskItem } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';

export default function StudioRegionPage() {
  const { taskId } = useParams<{ taskId: string }>(); const id = Number(taskId);
  const navigate = useNavigate(); const location = useLocation(); const { user } = useAuth();
  const toast = useToast();
  const [engine, setEngine] = useState<StudioEngine | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [ai, setAi] = useState<AIAssist | null>(null);
  const [aiKind, setAiKind] = useState<'ONNX' | 'Heuristic'>('Heuristic');

  useEffect(() => { let alive = true; (async () => {
    try {
      const wasm = await InkforgeWasm.load(wasmUrl);
      let task: TaskItem | undefined = (location.state as any)?.task;
      if (!task) { const { data } = await api.get<TaskItem[]>('/tasks/mine'); task = data.find(t => t.id === id); }
      const w = 1000, h = 1414; const doc = createDocument({ width: w, height: h, background: 'white' });
      const eng = new StudioEngine(doc, wasm);
      if (task?.pageImage) { try { const img = await loadImageFromBlob(await (await fetch(task.pageImage)).blob()); eng.setBuffer(doc.activeLayerId!, imageToBuffer(img, img.naturalWidth, img.naturalHeight, w, h)); } catch { /* draw on blank */ } }
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
  })(); return () => { alive = false; }; }, [id]);

  async function onSave() {
    if (!engine) return; setSaving(true);
    const tid = toast.loading('Đang nộp bài…');
    try {
      const blob = await exportPNG(engine); const fd = new FormData(); fd.append('file', new File([blob], `task-${id}.png`, { type: 'image/png' }));
      const { data } = await api.post<{ url: string }>('/uploads', fd);
      await api.post('/submissions', { taskId: id, fileUrl: data.url });
      toast.update(tid, 'success', 'Đã nộp bài.');
      navigate('/my-tasks');
    } catch (e) { console.error(e); toast.update(tid, 'error', 'Nộp bài thất bại. Thử lại nhé.'); } finally { setSaving(false); }
  }

  if (error) return <div className="grid h-screen place-items-center bg-bg text-ink"><div className="flex flex-col items-center gap-3 text-center"><p className="text-sm text-danger">{error}</p><button onClick={() => navigate('/my-tasks')} className="px-4 py-2 text-xs uppercase tracking-wide rounded bg-accent text-ink">Quay lại</button></div></div>;
  if (!engine || !ai) return <div className="grid h-screen place-items-center bg-bg text-ink"><div className="flex flex-col items-center gap-3 text-ink-soft"><Spinner size={28} className="text-accent" /><span className="font-mono text-xs uppercase tracking-wider">Đang mở Studio…</span></div></div>;
  return <div data-role={user ? roleScope(user.role) : 'assistant'} className="h-screen w-screen overflow-hidden bg-bg">
    <Studio engine={engine} ai={ai} aiKind={aiKind} onSave={onSave} onClose={() => navigate('/my-tasks')} saving={saving} title={`Việc #${id}`} />
  </div>;
}
