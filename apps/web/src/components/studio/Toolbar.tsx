import { Brush, Pencil, Pen, Eraser, Wind, Highlighter, Droplet, Zap, Eye, Wand2, Move, Expand, Type, MessageCircle, LayoutGrid, Grid3X3, Minus, Hand, Sparkles } from 'lucide-react';
import type { ToolId } from '../../lib/studio/types';

export interface ToolbarProps {
  tool: ToolId;
  onTool: (t: ToolId) => void;
}

const TOOL_GROUPS: { label: string; tools: { id: ToolId; icon: React.ReactNode; title: string }[] }[] = [
  {
    label: 'Draw',
    tools: [
      { id: 'brush', icon: <Brush size={20} />, title: 'Brush' },
      { id: 'pencil', icon: <Pencil size={20} />, title: 'Pencil' },
      { id: 'ink', icon: <Pen size={20} />, title: 'Ink' },
      { id: 'airbrush', icon: <Wind size={20} />, title: 'Airbrush' },
      { id: 'marker', icon: <Highlighter size={20} />, title: 'Marker' },
      { id: 'eraser', icon: <Eraser size={20} />, title: 'Eraser' },
    ],
  },
  {
    label: 'Fill',
    tools: [
      { id: 'bucket', icon: <Droplet size={20} />, title: 'Bucket Fill' },
      { id: 'gradient', icon: <Zap size={20} />, title: 'Gradient' },
      { id: 'eyedropper', icon: <Eye size={20} />, title: 'Eyedropper' },
    ],
  },
  {
    label: 'Select',
    tools: [
      { id: 'select-rect', icon: <LayoutGrid size={20} />, title: 'Rect Select' },
      { id: 'select-ellipse', icon: <Grid3X3 size={20} />, title: 'Ellipse Select' },
      { id: 'lasso', icon: <Wand2 size={20} />, title: 'Lasso' },
      { id: 'wand', icon: <Wand2 size={20} />, title: 'Magic Wand' },
      { id: 'ai-select', icon: <Sparkles size={20} />, title: 'AI Select' },
      { id: 'move', icon: <Move size={20} />, title: 'Move' },
      { id: 'transform', icon: <Expand size={20} />, title: 'Transform' },
    ],
  },
  {
    label: 'Manga',
    tools: [
      { id: 'panel', icon: <LayoutGrid size={20} />, title: 'Panel' },
      { id: 'tone', icon: <Grid3X3 size={20} />, title: 'Tone' },
      { id: 'line', icon: <Minus size={20} />, title: 'Line' },
    ],
  },
  {
    label: 'Text',
    tools: [
      { id: 'text', icon: <Type size={20} />, title: 'Text' },
      { id: 'bubble', icon: <MessageCircle size={20} />, title: 'Speech Bubble' },
    ],
  },
  {
    label: 'Navigation',
    tools: [
      { id: 'pan', icon: <Hand size={20} />, title: 'Pan' },
    ],
  },
];

export function Toolbar({ tool, onTool }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-2 bg-surface border-r border-line">
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {/* Optional: group label (hidden for compact UI) */}
          {/* <span className="text-xs font-mono uppercase text-ink-soft px-2">{group.label}</span> */}
          {group.tools.map(({ id, icon, title }) => (
            <button
              key={id}
              onClick={() => onTool(id)}
              aria-label={id}
              title={title}
              className={`p-2 rounded flex items-center justify-center transition-colors ${
                tool === id
                  ? 'bg-accent text-white'
                  : 'bg-surface text-ink-soft hover:text-ink hover:bg-surface/80'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
