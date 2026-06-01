import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { View } from '../../lib/studio/view';
import { screenToDoc } from '../../lib/studio/view';
import type { PointerSample } from '../../lib/studio/tools/Tool';

export interface CanvasStageProps {
  engine: StudioEngine;
  view: View;
  onViewChange: (v: View) => void;
  onPointerDown: (s: PointerSample) => void;
  onPointerMove: (s: PointerSample) => void;
  onPointerUp: (s: PointerSample) => void;
  cursor?: string;
  /** Hand/pan mode (e.g. Pan tool active or Space held). */
  panning?: boolean;
  /** Increment to re-fit the document to the viewport on demand. */
  fitToken?: number;
}

export function CanvasStage(props: CanvasStageProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<View>(props.view);
  const fittedRef = useRef(false);
  const panDrag = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);

  // Single source of truth: mirror the latest view into a ref so the
  // engine-change render callback (registered once) never reads a stale view.
  viewRef.current = props.view;

  const ensureBitmap = () => {
    const { width, height } = props.engine.doc;
    let b = bitmapRef.current;
    if (!b) { b = document.createElement('canvas'); bitmapRef.current = b; }
    if (b.width !== width || b.height !== height) { b.width = width; b.height = height; }
    return b;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    const bitmap = ensureBitmap();
    const { width: w, height: h } = props.engine.doc;
    const bctx = bitmap.getContext('2d');
    if (bctx) bctx.putImageData(new ImageData(props.engine.composite() as any, w, h), 0, 0);

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const v = viewRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(v.panX, v.panY);
    ctx.rotate(v.rotation);
    ctx.scale(v.zoom, v.zoom);
    ctx.imageSmoothingEnabled = v.zoom < 1; // crisp pixels when zoomed in, smooth when shrunk
    ctx.drawImage(bitmap, 0, 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1 / v.zoom;
    ctx.strokeRect(0, 0, w, h);
    ctx.restore();
  }, [props.engine]);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    const dw = props.engine.doc.width, dh = props.engine.doc.height;
    const zoom = Math.max(0.02, Math.min(cw / dw, ch / dh) * 0.92);
    const v: View = { zoom, panX: (cw - dw * zoom) / 2, panY: (ch - dh * zoom) / 2, rotation: 0 };
    viewRef.current = v;
    fittedRef.current = true;
    props.onViewChange(v);
    render();
  }, [props.engine, props.onViewChange, render]);

  // Repaint on engine changes (stable render reads the latest viewRef).
  useEffect(() => {
    const unsub = props.engine.onChange(render);
    render();
    return unsub;
  }, [props.engine, render]);

  // Repaint on external view changes.
  useEffect(() => { render(); }, [props.view, render]);

  // Resize to container; auto-fit once when the canvas first gets real dimensions.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof ResizeObserver === 'undefined') {
      // Environments without ResizeObserver (e.g. jsdom in tests): fit/paint once.
      if (!fittedRef.current) fit(); else render();
      return;
    }
    const ro = new ResizeObserver(() => { if (!fittedRef.current) fit(); else render(); });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [fit, render]);

  // Explicit re-fit (Fit button).
  useEffect(() => {
    if (props.fitToken === undefined || props.fitToken === 0) return;
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fitToken]);

  const toDoc = (e: { clientX: number; clientY: number }): PointerSample => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const d = screenToDoc(viewRef.current, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    return { x: d.x, y: d.y, pressure: 0.5, tiltX: 0, tiltY: 0 };
  };
  const sample = (e: React.PointerEvent): PointerSample => ({
    ...toDoc(e),
    pressure: e.pressure || 0.5,
    tiltX: e.tiltX ?? 0,
    tiltY: e.tiltY ?? 0,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* jsdom */ }
    if (props.panning || e.button === 1) {
      const v = viewRef.current;
      panDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, panX: v.panX, panY: v.panY };
      return;
    }
    props.onPointerDown(sample(e));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pd = panDrag.current;
    if (pd && pd.id === e.pointerId) {
      const next: View = { ...viewRef.current, panX: pd.panX + (e.clientX - pd.x), panY: pd.panY + (e.clientY - pd.y) };
      viewRef.current = next;
      props.onViewChange(next);
      render();
      return;
    }
    props.onPointerMove(sample(e));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) { try { canvas.releasePointerCapture(e.pointerId); } catch { /* jsdom */ } }
    if (panDrag.current && panDrag.current.id === e.pointerId) { panDrag.current = null; return; }
    props.onPointerUp(sample(e));
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const v = viewRef.current;
    const before = screenToDoc(v, { x: sx, y: sy });
    const speed = 1.15;
    const zoom = Math.max(0.05, Math.min(32, v.zoom * (e.deltaY > 0 ? 1 / speed : speed)));
    const after = screenToDoc({ ...v, zoom }, { x: sx, y: sy });
    const next: View = { ...v, zoom, panX: v.panX - (after.x - before.x) * zoom, panY: v.panY - (after.y - before.y) * zoom };
    viewRef.current = next;
    props.onViewChange(next);
    render();
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block touch-none"
      style={{ cursor: props.panning ? 'grab' : (props.cursor ?? 'crosshair') }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => { if (props.panning) e.preventDefault(); }}
    />
  );
}
