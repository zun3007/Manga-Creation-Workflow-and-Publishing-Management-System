import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import wasmUrl from '@manga/canvas-wasm/inkforge.wasm?url';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { api } from '../../lib/api';
import { roleScope } from '@manga/shared';
import { useAuth } from '../../lib/auth';
import { Studio } from '../../components/studio/Studio';
import { StudioEngine } from '../../lib/studio/engine';
import { HeuristicAI } from '../../lib/studio/ai/heuristic';
import { createDocument } from '../../lib/studio/document';
import { loadImageFromBlob, imageToBuffer, exportPNG } from '../../lib/studio/io';
import type { TaskItem } from '../../types';

export default function StudioRegionPage() {
  const { taskId } = useParams<{ taskId: string }>(); const id = Number(taskId);
  const navigate = useNavigate(); const location = useLocation(); const { user } = useAuth();
  const [engine, setEngine] = useState<StudioEngine | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const aiRef = useRef(new HeuristicAI());

  useEffect(() => { let alive = true; (async () => {
    try {
      const wasm = await InkforgeWasm.load(wasmUrl);
      let task: TaskItem | undefined = (location.state as any)?.task;
      if (!task) { const { data } = await api.get<TaskItem[]>('/tasks/mine'); task = data.find(t => t.id === id); }
      const w = 1000, h = 1414; const doc = createDocument({ width: w, height: h, background: 'white' });
      const eng = new StudioEngine(doc, wasm);
      if (task?.pageImage) { try { const img = await loadImageFromBlob(await (await fetch(task.pageImage)).blob()); eng.setBuffer(doc.activeLayerId!, imageToBuffer(img, img.naturalWidth, img.naturalHeight, w, h)); } catch { /* draw on blank */ } }
      if (alive) setEngine(eng);
    } catch (e) { console.error(e); if (alive) setError('Không mở được Studio.'); }
  })(); return () => { alive = false; }; }, [id]);

  async function onSave() {
    if (!engine) return; setSaving(true);
    try {
      const blob = await exportPNG(engine); const fd = new FormData(); fd.append('file', new File([blob], `task-${id}.png`, { type: 'image/png' }));
      const { data } = await api.post<{ url: string }>('/uploads', fd);
      await api.post('/submissions', { taskId: id, fileUrl: data.url });
      navigate('/my-tasks');
    } catch (e) { console.error(e); alert('Nộp bài thất bại.'); } finally { setSaving(false); }
  }

  if (error) return <div className="grid h-screen place-items-center bg-bg text-ink">{error}</div>;
  if (!engine) return <div className="grid h-screen place-items-center bg-bg text-ink font-mono text-xs uppercase tracking-wider animate-pulse">Đang mở Studio…</div>;
  return <div data-role={user ? roleScope(user.role) : 'assistant'} className="h-screen bg-bg">
    <Studio engine={engine} ai={aiRef.current} onSave={onSave} onClose={() => navigate('/my-tasks')} saving={saving} title={`Việc #${id}`} />
  </div>;
}
