import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
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
  const antsLastFrameRef = useRef(0);
  const antsMaskRef = useRef<Uint8Array | null>(null);
  const antsSegsRef = useRef<Float32Array | null>(null);
  const cachedCompositeRef = useRef<Uint8ClampedArray | null>(null);
  const compositeValidRef = useRef(false);
  const rafRenderRef = useRef<number | null>(null);

  // Single source of truth: mirror the latest view/overlays into refs so the
  // engine-change render callback (registered once) never reads stale values.
  // useLayoutEffect (not render-time writes) keeps this concurrent-render safe
  // while still committing before the browser paints.
  useLayoutEffect(() => {
    viewRef.current = props.view;
    overlaysRef.current = props.overlays;
  });

  const ensureBitmap = () => {
    const { width, height } = props.engine.doc;
    let b = bitmapRef.current;
    if (!b) { b = document.createElement('canvas'); bitmapRef.current = b; }
    if (b.width !== width || b.height !== height) { b.width = width; b.height = height; }
    return b;
  };

  // Marching-ants contour. Scanning every pixel to find selection edges is O(w*h),
  // so we do it ONLY when the selection mask changes (cached by identity) and store
  // the boundary as flat [x0,y0,x1,y1,...] segments. Per animation frame we just
  // re-stroke the cached segments with a new dash offset (one beginPath + one
  // stroke per colour pass). The previous code re-scanned every pixel AND issued a
  // beginPath+stroke PER edge pixel on EVERY frame, TWICE — on a full manga page
  // (~1.4M px) that blew the 16ms budget and made the canvas stutter/blink while a
  // selection was active ("chớp nháy" when drawing an ellipse/rectangle marquee).
  const buildContourSegments = (sel: Uint8Array, w: number, h: number): Float32Array => {
    const segs: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (sel[idx] === 0) continue;
        if (y === 0 || sel[idx - w] === 0) segs.push(x, y, x + 1, y); // top
        if (y === h - 1 || sel[idx + w] === 0) segs.push(x, y + 1, x + 1, y + 1); // bottom
        if (x === 0 || sel[idx - 1] === 0) segs.push(x, y, x, y + 1); // left
        if (x === w - 1 || sel[idx + 1] === 0) segs.push(x + 1, y, x + 1, y + 1); // right
      }
    }
    return new Float32Array(segs);
  };

  const contourSegments = (sel: Uint8Array, w: number, h: number): Float32Array => {
    if (antsMaskRef.current !== sel || antsSegsRef.current === null) {
      antsMaskRef.current = sel;
      antsSegsRef.current = buildContourSegments(sel, w, h);
    }
    return antsSegsRef.current;
  };

  const strokeContour = (ctx: CanvasRenderingContext2D, segs: Float32Array) => {
    ctx.beginPath();
    for (let i = 0; i < segs.length; i += 4) {
      ctx.moveTo(segs[i], segs[i + 1]);
      ctx.lineTo(segs[i + 2], segs[i + 3]);
    }
    ctx.stroke();
  };

  const drawMarchingAnts = (ctx: CanvasRenderingContext2D, sel: Uint8Array, w: number, h: number, zoom: number) => {
    const segs = contourSegments(sel, w, h);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -(marchingAntsOffsetRef.current);
    // Black outline first (visible on light art), then white dashes on top.
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3 / zoom;
    strokeContour(ctx, segs);
    ctx.strokeStyle = '#FFFFFF';
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5 / zoom;
    strokeContour(ctx, segs);
    ctx.restore();
  };

  const updateComposite = useCallback(() => {
    const bitmap = ensureBitmap();
    const { width: w, height: h } = props.engine.doc;
    const bctx = bitmap.getContext('2d');
    if (bctx) {
      const composite = props.engine.composite();
      cachedCompositeRef.current = composite;
      bctx.putImageData(
        new ImageData(composite as Uint8ClampedArray<ArrayBuffer>, w, h),
        0,
        0,
      );
    }
    compositeValidRef.current = true;
  }, [props.engine]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    updateComposite();

    const bitmap = bitmapRef.current!;
    const { width: w, height: h } = props.engine.doc;

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
      drawMarchingAnts(ctx, sel, w, h, v.zoom);
    }

    ctx.restore();
  }, [props.engine, updateComposite]);

  const renderAntsOnly = useCallback(() => {
    // Lightweight re-render that only updates marching ants offset without recompositing
    const canvas = canvasRef.current;
    if (!canvas || !compositeValidRef.current) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw <= 0 || ch <= 0) return;

    const bitmap = bitmapRef.current!;
    const { width: w, height: h } = props.engine.doc;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const v = viewRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(v.panX, v.panY);
    ctx.rotate(v.rotation);
    ctx.scale(v.zoom, v.zoom);
    ctx.imageSmoothingEnabled = v.zoom < 1;
    ctx.drawImage(bitmap, 0, 0);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1 / v.zoom;
    ctx.strokeRect(0, 0, w, h);

    // Non-destructive frame overlays
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
        ctx.textAlign = 'right';
        ctx.fillText(String(i + 1), rx + rw - 4 / v.zoom, ry + 4 / v.zoom);
      }
      ctx.restore();
    }

    // Marching ants only
    const sel = props.engine.selectionMask;
    if (sel && sel.length === w * h) {
      drawMarchingAnts(ctx, sel, w, h, v.zoom);
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

  // Coalesce engine-driven repaints into one per animation frame. A live brush
  // stamp or Move drag emits a change on every pointermove (often faster than the
  // display refresh); rendering synchronously each time recomposites ALL layers
  // through WASM repeatedly only to show the last paint — wasted work that causes
  // drag jank/tearing. Batching collapses them to a single composite per frame.
  const scheduleRender = useCallback(() => {
    if (rafRenderRef.current !== null) return;
    rafRenderRef.current = requestAnimationFrame(() => {
      rafRenderRef.current = null;
      render();
    });
  }, [render]);

  // Repaint on engine changes (stable render reads the latest viewRef).
  // Invalidate cached composite when document changes; first paint is synchronous.
  useEffect(() => {
    const unsub = props.engine.onChange(() => {
      compositeValidRef.current = false;
      scheduleRender();
    });
    compositeValidRef.current = false;
    render();
    return () => {
      unsub();
      if (rafRenderRef.current !== null) {
        cancelAnimationFrame(rafRenderRef.current);
        rafRenderRef.current = null;
      }
    };
  }, [props.engine, render, scheduleRender]);

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
  // Uses renderAntsOnly for minimal overhead (no document recomposite on each frame).
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
        // Advance the dashes at ~15fps. 60fps gives no visual benefit and the
        // contour re-stroke is the costly part, so gating it keeps the main thread
        // free and the canvas smooth while a selection is active.
        const animate = (t: number) => {
          if (t - antsLastFrameRef.current >= 64) {
            antsLastFrameRef.current = t;
            marchingAntsOffsetRef.current += 4;
            renderAntsOnly();
          }
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
  }, [props.engine, renderAntsOnly]);

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
