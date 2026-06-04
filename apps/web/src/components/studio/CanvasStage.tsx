import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { View } from '../../lib/studio/view';
import { screenToDoc } from '../../lib/studio/view';
import type { PointerSample } from '../../lib/studio/tools/Tool';
import type { RectN } from '../../lib/studio/types';

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
  /** Non-destructive frame overlays (e.g. AI-detected panels), normalized 0..1. */
  overlays?: RectN[];
}

export function CanvasStage(props: CanvasStageProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<View>(props.view);
  const overlaysRef = useRef<RectN[] | undefined>(props.overlays);
  const fittedRef = useRef(false);
  const panDrag = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const marchingAntsAnimationRef = useRef<number | null>(null);
  const marchingAntsOffsetRef = useRef(0);

  // Single source of truth: mirror the latest view/overlays into refs so the
  // engine-change render callback (registered once) never reads stale values.
  viewRef.current = props.view;
  overlaysRef.current = props.overlays;

  const ensureBitmap = () => {
    const { width, height } = props.engine.doc;
    let b = bitmapRef.current;
    if (!b) { b = document.createElement('canvas'); bitmapRef.current = b; }
    if (b.width !== width || b.height !== height) { b.width = width; b.height = height; }
    return b;
  };

  const drawSelectionContour = (ctx: CanvasRenderingContext2D, sel: Uint8Array, w: number, h: number) => {
    // Draw edges where selection changes from selected to unselected
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const isSelected = sel[idx] > 0;
        if (!isSelected) continue;

        // Check each edge and draw if it borders an unselected pixel
        const left = x === 0 || sel[idx - 1] === 0;
        const right = x === w - 1 || sel[idx + 1] === 0;
        const top = y === 0 || sel[idx - w] === 0;
        const bottom = y === h - 1 || sel[idx + w] === 0;

        // Draw line segments on edges
        if (top) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 1, y);
          ctx.stroke();
        }
        if (bottom) {
          ctx.beginPath();
          ctx.moveTo(x, y + 1);
          ctx.lineTo(x + 1, y + 1);
          ctx.stroke();
        }
        if (left) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 1);
          ctx.stroke();
        }
        if (right) {
          ctx.beginPath();
          ctx.moveTo(x + 1, y);
          ctx.lineTo(x + 1, y + 1);
          ctx.stroke();
        }
      }
    }
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

    // Non-destructive frame overlays (AI-detected / pending panels).
    const ov = overlaysRef.current;
    if (ov && ov.length) {
      ctx.save();
      ctx.lineWidth = 2 / v.zoom;
      ctx.textBaseline = 'top';
      ctx.font = `${14 / v.zoom}px sans-serif`;
      for (let i = 0; i < ov.length; i++) {
        const o = ov[i];
        const rx = o.x * w, ry = o.y * h, rw = o.width * w, rh = o.height * h;
        ctx.fillStyle = 'rgba(255,90,95,0.12)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#FF5A5F';
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.fillStyle = '#FF5A5F';
        ctx.textAlign = 'right'; // manga reads right-to-left → number the top-right corner
        ctx.fillText(String(i + 1), rx + rw - 4 / v.zoom, ry + 4 / v.zoom);
      }
      ctx.restore();
    }

    // Marching ants selection overlay (animated dashed outline).
    const sel = props.engine.selectionMask;
    if (sel && sel.length === w * h) {
      ctx.save();
      ctx.lineWidth = 1.5 / v.zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -(marchingAntsOffsetRef.current);

      // High-contrast alternating strokes (white primary, black outline for visibility)
      // Draw black outline first for visibility on light backgrounds
      ctx.strokeStyle = '#000000';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = (3 / v.zoom);
      drawSelectionContour(ctx, sel, w, h);

      // Then draw white stroke on top
      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = 1;
      ctx.lineWidth = (1.5 / v.zoom);
      drawSelectionContour(ctx, sel, w, h);

      ctx.restore();
    }

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

  // Repaint when frame overlays change.
  useEffect(() => { render(); }, [props.overlays, render]);

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

  // Marching-ants: animate only while a selection exists. Re-evaluated on every
  // engine change (subscribed below) so it STARTS on select and STOPS on deselect —
  // the effect deps alone can't see selection changes (the engine ref is stable).
  useEffect(() => {
    const stop = () => {
      if (marchingAntsAnimationRef.current !== null) {
        cancelAnimationFrame(marchingAntsAnimationRef.current);
        marchingAntsAnimationRef.current = null;
      }
    };
    const evaluate = () => {
      const sel = props.engine.selectionMask;
      const hasSel = !!sel && sel.length > 0;
      if (hasSel && marchingAntsAnimationRef.current === null) {
        const animate = () => {
          marchingAntsOffsetRef.current += 2;
          render();
          marchingAntsAnimationRef.current = requestAnimationFrame(animate);
        };
        marchingAntsAnimationRef.current = requestAnimationFrame(animate);
      } else if (!hasSel) {
        stop();
      }
    };
    evaluate();
    const unsub = props.engine.onChange(evaluate);
    return () => { unsub(); stop(); };
  }, [props.engine, render]);

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
