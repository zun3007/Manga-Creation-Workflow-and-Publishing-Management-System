import { useRef, useEffect, useState, type ReactNode } from 'react';
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
}

export function CanvasStage(props: CanvasStageProps): ReactNode {
  const visibleCanvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewState, setViewState] = useState<View>(props.view);

  // Initialize bitmap canvas on mount
  useEffect(() => {
    if (!bitmapCanvasRef.current) {
      bitmapCanvasRef.current = document.createElement('canvas');
      bitmapCanvasRef.current.width = props.engine.doc.width;
      bitmapCanvasRef.current.height = props.engine.doc.height;
    }
  }, [props.engine.doc.width, props.engine.doc.height]);

  // Render function that composites all layers to bitmap then draws to visible canvas
  const render = () => {
    const vCanvas = visibleCanvasRef.current;
    const bCanvas = bitmapCanvasRef.current;
    if (!vCanvas || !bCanvas) return;

    // Get the composite output from engine
    const out = props.engine.composite();
    const { width: w, height: h } = props.engine.doc;

    // Draw to bitmap canvas
    const bitmapCtx = bCanvas.getContext('2d');
    if (bitmapCtx) {
      const imageData = new ImageData(out as any, w, h);
      bitmapCtx.putImageData(imageData, 0, 0);
    }

    // Draw bitmap to visible canvas with transform
    const visibleCtx = vCanvas.getContext('2d');
    if (!visibleCtx) return;

    const dpr = window.devicePixelRatio || 1;
    vCanvas.width = vCanvas.clientWidth * dpr;
    vCanvas.height = vCanvas.clientHeight * dpr;
    visibleCtx.scale(dpr, dpr);

    visibleCtx.clearRect(0, 0, vCanvas.clientWidth, vCanvas.clientHeight);
    visibleCtx.save();

    // Apply view transform: pan, rotate, zoom
    visibleCtx.translate(viewState.panX, viewState.panY);
    visibleCtx.rotate(viewState.rotation);
    visibleCtx.scale(viewState.zoom, viewState.zoom);

    visibleCtx.imageSmoothingEnabled = false;
    visibleCtx.drawImage(bCanvas, 0, 0);

    // Draw 1px doc-border rect
    visibleCtx.strokeStyle = '#999';
    visibleCtx.lineWidth = 1 / viewState.zoom;
    visibleCtx.strokeRect(0, 0, w, h);

    visibleCtx.restore();
  };

  // Subscribe to engine changes and render on view changes
  useEffect(() => {
    const unsubscribe = props.engine.onChange(render);
    render();
    return unsubscribe;
  }, [props.engine]);

  // Re-render when view changes
  useEffect(() => {
    setViewState(props.view);
    render();
  }, [props.view]);

  // Pointer event handlers
  const handlePointer = (
    e: React.PointerEvent<HTMLCanvasElement>,
    handler: (s: PointerSample) => void
  ) => {
    const canvas = visibleCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const docCoords = screenToDoc(viewState, { x: clientX, y: clientY });

    const sample: PointerSample = {
      x: docCoords.x,
      y: docCoords.y,
      pressure: e.pressure ?? 0.5,
      tiltX: e.tiltX ?? 0,
      tiltY: e.tiltY ?? 0,
    };

    handler(sample);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = visibleCanvasRef.current;
    if (canvas && typeof canvas.setPointerCapture === 'function') {
      canvas.setPointerCapture(e.pointerId);
    }
    handlePointer(e, props.onPointerDown);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    handlePointer(e, props.onPointerMove);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = visibleCanvasRef.current;
    if (canvas && typeof canvas.releasePointerCapture === 'function') {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // jsdom may not support pointer capture in tests
      }
    }
    handlePointer(e, props.onPointerUp);
  };

  // Zoom handling with wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = visibleCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Get doc coords under cursor before zoom
    const docBefore = screenToDoc(viewState, { x: clientX, y: clientY });

    // Calculate new zoom
    const zoomSpeed = 1.2;
    const zoomDelta = e.deltaY > 0 ? 1 / zoomSpeed : zoomSpeed;
    const newZoom = Math.max(0.05, Math.min(32, viewState.zoom * zoomDelta));

    // Calculate new pan so doc point stays under cursor
    const docAfter = screenToDoc(
      { ...viewState, zoom: newZoom },
      { x: clientX, y: clientY }
    );

    const newPanX = viewState.panX - (docAfter.x - docBefore.x) * newZoom;
    const newPanY = viewState.panY - (docAfter.y - docBefore.y) * newZoom;

    const newView: View = {
      ...viewState,
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY,
    };

    setViewState(newView);
    props.onViewChange(newView);
  };

  return (
    <canvas
      ref={visibleCanvasRef}
      className="w-full h-full block bg-surface cursor-crosshair"
      style={{ cursor: props.cursor ?? 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    />
  );
}
