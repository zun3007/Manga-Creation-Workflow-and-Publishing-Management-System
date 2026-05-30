import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import wasmUrl from '@manga/canvas-wasm/inkforge.wasm?url';
import { InkforgeWasm } from '@manga/canvas-wasm';
import { api } from '../../lib/api';
import { roleScope } from '@manga/shared';
import { useAuth } from '../../lib/auth';
import { Studio } from '../../components/studio/Studio';
import { StudioEngine } from '../../lib/studio/engine';
import { HeuristicAI } from '../../lib/studio/ai/heuristic';
import { createDocument } from '../../lib/studio/document';
import { deserializeDoc, loadImageFromBlob, imageToBuffer, serializeDoc, exportPNG } from '../../lib/studio/io';
import type { RectN } from '../../lib/studio/types';
import type { PageDetail } from '../../types';

export default function StudioPage() {
  const { pageId } = useParams<{ pageId: string }>(); const id = Number(pageId);
  const navigate = useNavigate(); const { user } = useAuth();
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const aiRef = useRef(new HeuristicAI());

  useEffect(() => { let alive = true; (async () => {
    try {
      const wasm = await InkforgeWasm.load(wasmUrl);
      const { data: page } = await api.get<PageDetail>(`/pages/${id}`);
      const docRes = await api.get(`/studio/docs/${id}`).catch(() => ({ data: null as any }));
      let eng: StudioEngine;
      if (docRes.data && docRes.data.doc) { eng = await deserializeDoc(docRes.data, wasm); }
      else {
        const img = await loadImageFromBlob(await (await fetch(page.imageUrl)).blob());
        const w = img.naturalWidth || 1000, h = img.naturalHeight || 1414;
        const doc = createDocument({ width: w, height: h, background: 'white' });
        eng = new StudioEngine(doc, wasm);
        eng.setBuffer(doc.activeLayerId!, imageToBuffer(img, w, h, w, h));
      }
      if (alive) setEngine(eng);
    } catch (e) { console.error(e); if (alive) setError('Không mở được Studio.'); }
  })(); return () => { alive = false; }; }, [id]);

  async function uploadBlob(blob: Blob, name: string): Promise<string> {
    const fd = new FormData(); fd.append('file', new File([blob], name, { type: 'image/png' }));
    const { data } = await api.post<{ url: string }>('/uploads', fd); return data.url;
  }
  async function onSave() {
    if (!engine) return; setSaving(true);
    try {
      const flatUrl = await uploadBlob(await exportPNG(engine), `page-${id}.png`);
      await api.post('/studio/page-versions', { pageId: id, imageUrl: flatUrl });
      const { manifest, blobs } = await serializeDoc(engine);
      for (const [lid, blob] of Object.entries(blobs)) manifest.layerImages[lid] = await uploadBlob(blob, `layer-${id}-${lid}.png`);
      await api.post('/studio/docs', { pageId: id, manifest });
    } catch (e) { console.error(e); alert('Lưu thất bại.'); } finally { setSaving(false); }
  }
  async function onSaveRegions(frames: RectN[]) {
    for (const r of frames) { try { await api.post('/regions', { pageId: id, regionType: 'PANEL', x: r.x, y: r.y, width: r.width, height: r.height }); } catch (e) { console.error(e); } }
  }

  if (error) return <div className="grid h-screen place-items-center bg-bg text-ink">{error}</div>;
  if (!engine) return <div className="grid h-screen place-items-center bg-bg text-ink font-mono text-xs uppercase tracking-wider animate-pulse">Đang mở Studio…</div>;
  return <div data-role={user ? roleScope(user.role) : 'mangaka'} className="h-screen bg-bg">
    <Studio engine={engine} ai={aiRef.current} onSave={onSave} onSaveRegions={onSaveRegions} onClose={() => navigate(-1)} saving={saving} title={`Trang ${id}`} />
  </div>;
}
