import type { ReactNode, CSSProperties } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  tab?: string;
  tone?: 'paper' | 'paper-2';
  style?: CSSProperties;
}

/** A framed "manga panel" surface: ink border + hard offset shadow. */
export function Panel({ children, className = '', tab, tone = 'paper', style }: PanelProps) {
  const bg = tone === 'paper-2' ? 'bg-paper-2' : 'bg-paper';
  return (
    <div
      style={style}
      className={`relative border-2 border-ink shadow-ink ${bg} ${className}`}
    >
      {tab && (
        <span className="label absolute -top-3 left-4 bg-ink px-2 py-0.5 text-[0.6rem] text-paper">
          {tab}
        </span>
      )}
      {children}
    </div>
  );
}
