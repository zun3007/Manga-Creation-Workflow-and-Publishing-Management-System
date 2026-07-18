import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Upload, RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { AIAssist } from '../../lib/studio/ai/AIAssist';
import type { BrushSettings, ToolId, RGBA, RectN } from '../../lib/studio/types';
import { useConfirm } from '../../lib/confirm';
import { MANGA_PALETTE } from '../../lib/studio/color';
import { makeView, type View } from '../../lib/studio/view';
import {
  exportPNG,
  exportLayerPNG,
  exportRegionPNG,
  loadImageFromBlob,
  imageToBuffer,
} from '../../lib/studio/io';
import { createTools } from '../../lib/studio/tools/registry';
import { drawFrameBorders } from '../../lib/studio/panels';
import type { PointerSample } from '../../lib/studio/tools/Tool';
import { Toolbar } from './Toolbar';
import { CanvasStage } from './CanvasStage';
import { ColorPanel } from './ColorPanel';
import { BrushControls } from './BrushControls';
import { LayerPanel } from './LayerPanel';
import { PanelTools } from './PanelTools';
import { AIAssistPanel } from './AIAssistPanel';
import { ToneControls } from './ToneControls';
import { EffectsPanel } from './EffectsPanel';
import { MangaRulers } from './MangaRulers';
import { TextControls } from './TextControls';
import { ToolOptions } from './ToolOptions';

export interface StudioProps {
  engine: StudioEngine;
  ai: AIAssist;
  aiKind?: 'ONNX' | 'Heuristic';
  onSave: () => void | Promise<void>;
  onClose: () => void;
  onSaveRegions?: (frames: RectN[]) => void;
  assignedRegion?: RectN;
  saving?: boolean;
  title?: string;
}

export function Studio({
  engine,
  ai,
  aiKind = 'Heuristic',
  onSave,
  onClose,
  onSaveRegions,
  assignedRegion,
  saving,
  title,
}: StudioProps) {
  const { confirm } = useConfirm();
  const [tool, setTool] = useState<ToolId>('brush');
  const [settings, setSettings] = useState<BrushSettings>({
    tool: 'brush',
    size: 18,
    opacity: 1,
    flow: 1,
    hardness: 0.8,
    spacing: 0.1,
    stabilize: 0.3,
    pressureSize: true,
    pressureOpacity: true,
  });
  const [colors, setColors] = useState<{ fg: RGBA; bg: RGBA }>({
    fg: { r: 0, g: 0, b: 0, a: 255 },
    bg: { r: 255, g: 255, b: 255, a: 255 },
  });
  const [activeColorSlot, setActiveColorSlot] = useState<'fg' | 'bg'>('fg');
  const color = colors[activeColorSlot];
  const setColor = (c: RGBA) => {
    setColors((prev) => ({ ...prev, [activeColorSlot]: c }));
  };
  const [tolerance, setTolerance] = useState(24);
  const [bubbleType, setBubbleType] = useState<'round' | 'spiky' | 'thought'>('round');
  const [lineWidth, setLineWidth] = useState(3);
  const [palette, setPalette] = useState(MANGA_PALETTE);
  const [recent, setRecent] = useState<string[]>([]);
  const [view, setView] = useState<View>(makeView({ zoom: 1 }));
  const [version, setVersion] = useState(0);
  const [pendingFrames, setPendingFrames] = useState<RectN[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const prevToolRef = useRef<ToolId>('brush');
  const toolRef = useRef<ToolId>(tool);

  // Refs to keep tool getters reading latest state
  const settingsRef = useRef(settings);
  const colorRef = useRef(color);
  const toleranceRef = useRef(tolerance);
  const bubbleRef = useRef(bubbleType);
  const lineWidthRef = useRef(lineWidth);
  const aiRef = useRef(ai);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    toleranceRef.current = tolerance;
  }, [tolerance]);

  useEffect(() => {
    bubbleRef.current = bubbleType;
  }, [bubbleType]);

  useEffect(() => {
    lineWidthRef.current = lineWidth;
  }, [lineWidth]);

  useEffect(() => {
    aiRef.current = ai;
  }, [ai]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Create tools once
  const tools = useRef(
    createTools({
      getSettings: () => settingsRef.current,
      getColor: () => colorRef.current,
      setColor: (c) => {
        setColor(c);
        setRecent((r) => {
          const hex = `#${c.r.toString(16).padStart(2, '0')}${c.g
            .toString(16)
            .padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`;
          return [hex, ...r.filter((x) => x !== hex)].slice(0, 5);
        });
      },
      getTolerance: () => toleranceRef.current,
      getBubbleType: () => bubbleRef.current,
      getLineWidth: () => lineWidthRef.current,
      onFrame: (r) => setPendingFrames((f) => [...f, r]),
      aiSegment: async (px, w, h, pt) => {
        try {
          const mask = await aiRef.current.segment(px, w, h, pt);
          engine.setSelection(mask);
        } catch (err) {
          console.error('[Studio] ai-select error:', err);
        }
      },
    })
  ).current;

  // Subscribe to engine changes
  useEffect(() => {
    const unsubscribe = engine.onChange(() => setVersion((v) => v + 1));
    return unsubscribe;
  }, [engine]);

  // Pointer event handlers
  const handlePointerDown = (s: PointerSample) => {
    if (tool === 'pan') return;
    const activeTool = tools[tool];
    activeTool?.onDown(s, engine);
  };

  const handlePointerMove = (s: PointerSample) => {
    if (tool === 'pan') return;
    const activeTool = tools[tool];
    activeTool?.onMove(s, engine);
  };

  const handlePointerUp = (s: PointerSample) => {
    if (tool === 'pan') return;
    const activeTool = tools[tool];
    activeTool?.onUp(s, engine);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Undo/Redo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        engine.undo();
      } else if (
        (mod && e.shiftKey && e.key === 'z') ||
        (mod && e.key === 'y')
      ) {
        e.preventDefault();
        engine.redo();
      }

      // Copy/Paste
      if (mod && e.key === 'c') {
        e.preventDefault();
        engine.copySelection();
      } else if (mod && e.key === 'v') {
        e.preventDefault();
        engine.paste();
      }

      // Deselect (Ctrl+D)
      if (mod && e.key === 'd') {
        e.preventDefault();
        engine.clearSelection();
      }

      // Skip tool/color shortcuts when typing
      if (isTyping(e.target)) return;

      // Color swap (X)
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        setActiveColorSlot((s) => (s === 'fg' ? 'bg' : 'fg'));
      }

      // Reset colors to black/white (D, but not Ctrl+D)
      if (!mod && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setColors({
          fg: { r: 0, g: 0, b: 0, a: 255 },
          bg: { r: 255, g: 255, b: 255, a: 255 },
        });
        setActiveColorSlot('fg');
      }

      // Tool shortcuts
      if (e.key === 'b' || e.key === 'B') setTool('brush');
      if (e.key === 'e' || e.key === 'E') setTool('eraser');
      if (e.key === 'g' || e.key === 'G') setTool('bucket');
      if (e.key === 'i' || e.key === 'I') setTool('eyedropper');
      if (e.key === 't' || e.key === 'T') setTool('text');

      // Size shortcuts
      if (e.key === '[') {
        e.preventDefault();
        setSettings((s) => ({ ...s, size: Math.max(1, s.size - 2) }));
      } else if (e.key === ']') {
        e.preventDefault();
        setSettings((s) => ({ ...s, size: s.size + 2 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, tool]);

  // Hold Space to temporarily pan; releasing restores the previous tool.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isTyping(e.target)) {
        e.preventDefault();
        if (toolRef.current !== 'pan') prevToolRef.current = toolRef.current;
        setTool('pan');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setTool(prevToolRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // beforeunload handler: guard against closing/refreshing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (engine.isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [engine]);

  // Fullscreen + zoom controls
  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.();
  };
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const zoomAround = (factor: number) => {
    const el = canvasWrapRef.current;
    setView((v) => {
      const z = Math.max(0.05, Math.min(32, v.zoom * factor));
      if (!el) return { ...v, zoom: z };
      const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
      const docX = (cx - v.panX) / v.zoom, docY = (cy - v.panY) / v.zoom;
      return { ...v, zoom: z, panX: cx - docX * z, panY: cy - docY * z };
    });
  };

  const handleAddSwatch = (hex: string) => {
    setPalette((p) => [hex, ...p.filter((x) => x !== hex)].slice(0, 10));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = await loadImageFromBlob(file);
      engine.addLayer('raster', 'Imported');
      const activeId = engine.doc.activeLayerId;
      if (!activeId) return;
      const buf = imageToBuffer(
        img,
        img.naturalWidth,
        img.naturalHeight,
        engine.doc.width,
        engine.doc.height
      );
      engine.setBuffer(activeId, buf);
      engine.requestRender();
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  const handleExportFull = async () => {
    try {
      const blob = await exportPNG(engine);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'export'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleExportLayer = async () => {
    const activeId = engine.doc.activeLayerId;
    if (!activeId) return;
    try {
      const blob = await exportLayerPNG(engine, activeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'export'}-layer.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const selectionRect = (): RectN | null => {
    const m = engine.selectionMask;
    if (!m) return null;
    const w = engine.doc.width;
    const h = engine.doc.height;
    let minx = w,
      miny = h,
      maxx = -1,
      maxy = -1;
    for (let p = 0; p < m.length; p++) {
      if (m[p]) {
        const x = p % w;
        const y = (p / w) | 0;
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
    if (maxx < 0) return null;
    return {
      x: minx / w,
      y: miny / h,
      width: (maxx - minx + 1) / w,
      height: (maxy - miny + 1) / h,
    };
  };

  const handleExportRegion = async () => {
    const rect = selectionRect();
    if (rect) {
      try {
        const blob = await exportRegionPNG(engine, rect);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'export'}-region.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export region failed:', err);
      }
    } else {
      // No selection, export full image
      handleExportFull();
    }
  };

  const inkFrames = (frames: RectN[]) => {
    if (!frames.length) return;
    engine.addLayer('raster', 'Khung');
    const active = engine.doc.activeLayerId;
    if (active) {
      drawFrameBorders(engine.getBuffer(active), engine.doc.width, engine.doc.height, frames, 4);
      engine.requestRender();
    }
  };

  const handleInkFrames = () => {
    inkFrames(pendingFrames);
    setPendingFrames([]);
  };

  // Save = draw the borders (so the panels don't vanish) AND persist them as regions.
  const handleSaveRegions = () => {
    if (pendingFrames.length === 0) return;
    inkFrames(pendingFrames);
    onSaveRegions?.(pendingFrames);
    setPendingFrames([]);
  };

  const cursor = tools[tool]?.cursor ?? 'crosshair';

  // Wrapped close handler: confirm if there are unsaved changes
  const handleClose = async () => {
    if (engine.isDirty()) {
      const confirmed = await confirm({
        title: 'Thoát Studio?',
        body: 'Bản vẽ chưa lưu sẽ mất.',
        tone: 'danger',
      });
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <div ref={rootRef} className="flex h-full w-full overflow-hidden min-h-0 bg-surface text-ink" data-role="studio">
      {/* Left toolbar */}
      <Toolbar tool={tool} onTool={setTool} />

      {/* Center canvas */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-surface-alt border-b border-line">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-ink-soft">
              {title || 'Studio'}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => zoomAround(1 / 1.25)} title="Thu nhỏ" aria-label="Zoom out" className="p-1.5 hover:bg-surface rounded transition-colors">
                <ZoomOut size={16} />
              </button>
              <span className="w-12 text-center text-xs font-mono text-ink-soft tabular-nums">
                {(view.zoom * 100).toFixed(0)}%
              </span>
              <button onClick={() => zoomAround(1.25)} title="Phóng to" aria-label="Zoom in" className="p-1.5 hover:bg-surface rounded transition-colors">
                <ZoomIn size={16} />
              </button>
              <button onClick={() => setFitToken((t) => t + 1)} title="Vừa khung hình" aria-label="Fit to screen" className="px-2 py-1 text-xs font-mono uppercase hover:bg-surface rounded transition-colors">
                Fit
              </button>
            </div>
            <div
              className="px-2 py-1 text-xs font-mono bg-surface border border-line rounded text-ink-soft"
              aria-label="ai-status"
            >
              AI: {aiKind}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <button
              onClick={() => engine.undo()}
              title="Undo (Ctrl+Z)"
              className="p-2 hover:bg-surface rounded transition-colors"
              aria-label="Undo"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => engine.redo()}
              title="Redo (Ctrl+Shift+Z)"
              className="p-2 hover:bg-surface rounded transition-colors"
              aria-label="Redo"
            >
              <RotateCw size={18} />
            </button>

            {/* Export menu */}
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="px-3 py-2 text-xs font-mono uppercase rounded hover:bg-surface flex items-center gap-1"
                aria-label="Export menu"
              >
                <Download size={16} />
                <ChevronDown size={14} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-surface-alt border border-line rounded shadow-lg z-50">
                  <button
                    onClick={() => {
                      handleExportFull();
                      setExportOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-surface"
                  >
                    Export Full
                  </button>
                  <button
                    onClick={() => {
                      handleExportLayer();
                      setExportOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-surface"
                  >
                    Export Layer
                  </button>
                  <button
                    onClick={() => {
                      handleExportRegion();
                      setExportOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-surface"
                  >
                    Export Region
                  </button>
                </div>
              )}
            </div>

            {/* Import */}
            <label className="px-3 py-2 text-xs font-mono uppercase rounded hover:bg-surface flex items-center gap-1 cursor-pointer">
              <Upload size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImport}
                className="hidden"
                aria-label="Import image"
              />
            </label>

            {/* Frame actions: preview overlay -> ink borders and/or save as regions */}
            {pendingFrames.length > 0 && (
              <button
                onClick={handleInkFrames}
                className="px-3 py-2 text-xs font-mono uppercase rounded border border-line text-ink hover:bg-surface"
                aria-label="Ink frame borders"
                title="Vẽ viền khung lên layer"
              >
                Vẽ viền ({pendingFrames.length})
              </button>
            )}
            {pendingFrames.length > 0 && (
              <button
                onClick={handleSaveRegions}
                className="px-3 py-2 text-xs font-mono uppercase rounded bg-accent text-ink hover:opacity-90"
                aria-label="Save regions"
              >
                Lưu khung ({pendingFrames.length})
              </button>
            )}

            {/* Save button */}
            <button
              onClick={() => onSave()}
              disabled={saving}
              className="px-3 py-2 text-xs font-mono uppercase rounded bg-accent text-ink hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              aria-label="Save"
            >
              {saving && <span className="animate-spin">⟳</span>}
              Lưu
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              title="Toàn màn hình"
              className="p-2 hover:bg-surface rounded transition-colors"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="px-3 py-2 text-xs font-mono uppercase rounded hover:bg-surface"
              aria-label="Close"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Canvas with checkerboard background */}
        <div
          ref={canvasWrapRef}
          className="relative flex-1 overflow-hidden min-h-0"
          style={{
            backgroundImage:
              'repeating-conic-gradient(#e5e5e5 0% 25%, transparent 0% 50%)',
            backgroundSize: '20px 20px',
          }}
        >
          <CanvasStage
            engine={engine}
            view={view}
            onViewChange={setView}
            panning={tool === 'pan'}
            fitToken={fitToken}
            overlays={assignedRegion ? [assignedRegion, ...pendingFrames] : pendingFrames}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            cursor={cursor}
          />
        </div>
      </div>

      {/* Right dock with collapsible panels */}
      <div className="w-72 shrink-0 flex flex-col gap-0 bg-surface border-l border-line overflow-y-auto min-h-0">
        {/* Color Panel */}
        <div className="border-b border-line">
          <ColorPanel
            colors={colors}
            onColors={setColors}
            activeColorSlot={activeColorSlot}
            onActiveColorSlot={setActiveColorSlot}
            palette={palette}
            onAddSwatch={handleAddSwatch}
            recent={recent}
          />
        </div>

        {/* Brush Controls */}
        <div className="border-b border-line">
          <BrushControls
            settings={settings}
            onChange={setSettings}
          />
        </div>

        {/* Tool Options */}
        {(tool === 'bucket' || tool === 'wand' || tool === 'bubble' || tool === 'line') && (
          <ToolOptions
            tool={tool}
            tolerance={tolerance}
            onToleranceChange={setTolerance}
            bubbleType={bubbleType}
            onBubbleTypeChange={setBubbleType}
            lineWidth={lineWidth}
            onLineWidthChange={setLineWidth}
          />
        )}

        {/* Layer Panel */}
        <div className="border-b border-line">
          <LayerPanel engine={engine} version={version} />
        </div>

        {/* Contextual panels */}
        {(tool === 'panel' || tool === 'bucket') && (
          <div className="border-b border-line">
            <PanelTools
              engine={engine}
              onFrames={(frames) => setPendingFrames((f) => [...f, ...frames])}
            />
          </div>
        )}

        {tool === 'tone' && (
          <div className="border-b border-line">
            <ToneControls engine={engine} />
          </div>
        )}

        {tool === 'line' && (
          <div className="border-b border-line">
            <EffectsPanel engine={engine} />
          </div>
        )}

        {(tool === 'panel' || tool === 'text' || tool === 'bubble') && (
          <div className="border-b border-line">
            <MangaRulers engine={engine} color={color} version={version} />
          </div>
        )}

        {tool === 'text' && (
          <div className="border-b border-line">
            <TextControls engine={engine} version={version} />
          </div>
        )}

        {/* AI Assist Panel */}
        <div className="border-b border-line">
          <AIAssistPanel
            engine={engine}
            ai={ai}
            onPanels={(frames) => setPendingFrames((f) => [...f, ...frames])}
          />
        </div>
      </div>
    </div>
  );
}
