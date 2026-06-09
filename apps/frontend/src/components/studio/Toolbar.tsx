import { Brush, Pencil, Pen, Eraser, Wind, Highlighter, Droplet, Zap, Eye, Wand2, Move, Expand, Type, MessageCircle, LayoutGrid, Grid3X3, Minus, Hand, Sparkles } from 'lucide-react';
import type { ToolId } from '../../lib/studio/types';
import { Tooltip } from '../ui/Tooltip';

export interface ToolbarProps {
  tool: ToolId;
  onTool: (t: ToolId) => void;
}

const TOOL_GROUPS: { label: string; tools: { id: ToolId; icon: React.ReactNode; desc: string }[] }[] = [
  {
    label: 'Draw',
    tools: [
      { id: 'brush', icon: <Brush size={20} />, desc: 'Cọ vẽ (B)' },
      { id: 'pencil', icon: <Pencil size={20} />, desc: 'Bút chì' },
      { id: 'ink', icon: <Pen size={20} />, desc: 'Bút mực' },
      { id: 'airbrush', icon: <Wind size={20} />, desc: 'Phun màu (airbrush)' },
      { id: 'marker', icon: <Highlighter size={20} />, desc: 'Bút dạ quang' },
      { id: 'eraser', icon: <Eraser size={20} />, desc: 'Tẩy (E)' },
    ],
  },
  {
    label: 'Fill',
    tools: [
      { id: 'bucket', icon: <Droplet size={20} />, desc: 'Đổ màu (G)' },
      { id: 'gradient', icon: <Zap size={20} />, desc: 'Chuyển sắc (gradient)' },
      { id: 'eyedropper', icon: <Eye size={20} />, desc: 'Hút màu (I)' },
    ],
  },
  {
    label: 'Select',
    tools: [
      { id: 'select-rect', icon: <LayoutGrid size={20} />, desc: 'Chọn vùng chữ nhật' },
      { id: 'select-ellipse', icon: <Grid3X3 size={20} />, desc: 'Chọn vùng elip' },
      { id: 'lasso', icon: <Wand2 size={20} />, desc: 'Chọn tự do (lasso)' },
      { id: 'wand', icon: <Wand2 size={20} />, desc: 'Đũa thần — chọn theo màu' },
      { id: 'ai-select', icon: <Sparkles size={20} />, desc: 'AI chọn vùng thông minh' },
      { id: 'move', icon: <Move size={20} />, desc: 'Di chuyển vùng chọn' },
      { id: 'transform', icon: <Expand size={20} />, desc: 'Biến đổi (scale / xoay)' },
    ],
  },
  {
    label: 'Manga',
    tools: [
      { id: 'panel', icon: <LayoutGrid size={20} />, desc: 'Khung truyện (panel)' },
      { id: 'tone', icon: <Grid3X3 size={20} />, desc: 'Tô nền (tone / screentone)' },
      { id: 'line', icon: <Minus size={20} />, desc: 'Vẽ đường thẳng' },
    ],
  },
  {
    label: 'Text',
    tools: [
      { id: 'text', icon: <Type size={20} />, desc: 'Văn bản (T)' },
      { id: 'bubble', icon: <MessageCircle size={20} />, desc: 'Bong bóng thoại' },
    ],
  },
  {
    label: 'Navigation',
    tools: [
      { id: 'pan', icon: <Hand size={20} />, desc: 'Di chuyển khung nhìn (giữ Space / chuột giữa)' },
    ],
  },
];

export function Toolbar({ tool, onTool }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-2 bg-surface border-r border-line h-full overflow-y-auto shrink-0">
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {group.tools.map(({ id, icon, desc }) => (
            <Tooltip key={id} label={desc} side="right">
              <button
                onClick={() => onTool(id)}
                aria-label={id}
                title={desc}
                className={`p-2 rounded flex items-center justify-center transition-colors ${
                  tool === id
                    ? 'bg-accent text-white'
                    : 'bg-surface text-ink-soft hover:text-ink hover:bg-surface/80'
                }`}
              >
                {icon}
              </button>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
