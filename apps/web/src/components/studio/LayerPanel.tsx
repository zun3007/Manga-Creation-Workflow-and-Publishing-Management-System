import { useState } from 'react';
import type { StudioEngine } from '../../lib/studio/engine';
import type { BlendMode, LayerData } from '../../lib/studio/types';

export interface LayerPanelProps {
  engine: StudioEngine;
  version: number;
}

export function LayerPanel({ engine, version: _version }: LayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (layer: LayerData) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const finishEdit = (id: string) => {
    if (editingId === id && editName !== engine.doc.layers.find(l => l.id === id)?.name) {
      engine.renameLayer(id, editName);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') finishEdit(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  const blendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'add', 'darken', 'lighten'];
  const activeId = engine.doc.activeLayerId;
  const activeLayer = activeId ? engine.doc.layers.find(l => l.id === activeId) : null;

  // Render layers top-to-bottom (reverse order)
  const displayLayers = [...engine.doc.layers].reverse();

  return (
    <div className="flex flex-col gap-2 p-2 bg-surface border-l border-line">
      {/* Top controls */}
      <div className="flex gap-1 flex-wrap">
        <button
          aria-label="Add layer"
          onClick={() => engine.addLayer('raster')}
          className="px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90"
          title="Add Layer"
        >
          +
        </button>
        <button
          onClick={() => activeId && engine.removeLayer(activeId)}
          disabled={!activeId || engine.doc.layers.length === 1}
          className="px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete Layer"
        >
          -
        </button>
        <button
          onClick={() => activeId && engine.duplicateLayer(activeId)}
          disabled={!activeId}
          className="px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Duplicate Layer"
        >
          D
        </button>
        <button
          onClick={() => activeId && engine.mergeDown(activeId)}
          disabled={!activeId}
          className="px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Merge Down"
        >
          M↓
        </button>
        <button
          onClick={() => engine.flattenImage()}
          className="px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90"
          title="Flatten Image"
        >
          F
        </button>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {displayLayers.map((layer) => {
          const isActive = layer.id === activeId;
          const isEditing = editingId === layer.id;

          return (
            <div
              key={layer.id}
              onClick={() => engine.setActiveLayer(layer.id)}
              className={`p-2 rounded cursor-pointer border transition-colors ${
                isActive ? 'bg-accent/15 ring-1 ring-accent border-accent' : 'bg-surface border-line hover:bg-surface/80'
              }`}
            >
              {/* Visibility + name + edit */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.setLayerVisible(layer.id, !layer.visible);
                  }}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-ink-soft hover:text-ink"
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible ? '👁' : '🚫'}
                </button>

                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => finishEdit(layer.id)}
                    onKeyDown={(e) => handleKeyDown(e, layer.id)}
                    className="flex-1 px-1 py-0 text-sm bg-bg text-ink border border-line rounded min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEdit(layer)}
                    className="flex-1 text-sm text-ink truncate hover:underline"
                  >
                    {layer.name}
                  </span>
                )}

                {/* Lock toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    engine.setLayerLocked(layer.id, !layer.locked);
                  }}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-ink-soft hover:text-ink text-xs"
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </div>

              {/* Only show controls for active layer */}
              {isActive && activeLayer && (
                <div className="space-y-2 pt-2 border-t border-line/30">
                  {/* Opacity slider */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-mono uppercase text-ink-soft flex-shrink-0 w-12">
                      Opacity
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(activeLayer.opacity * 100)}
                      onChange={(e) => engine.setLayerOpacity(activeLayer.id, Number(e.target.value) / 100)}
                      className="flex-1 h-1"
                    />
                    <span className="text-xs text-ink-soft flex-shrink-0 w-8 text-right">
                      {Math.round(activeLayer.opacity * 100)}%
                    </span>
                  </div>

                  {/* Blend mode select */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-mono uppercase text-ink-soft flex-shrink-0 w-12">
                      Blend
                    </label>
                    <select
                      value={activeLayer.blendMode}
                      onChange={(e) => engine.setLayerBlend(activeLayer.id, e.target.value as BlendMode)}
                      className="flex-1 px-2 py-0 text-xs bg-bg text-ink border border-line rounded"
                    >
                      {blendModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clip toggle */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-mono uppercase text-ink-soft flex-shrink-0 w-12">
                      Clip
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={activeLayer.clipped}
                        onChange={(e) => engine.setLayerClipped(activeLayer.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-ink-soft">Clipped to below</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
