import { useRef, useState, type ReactNode } from 'react';

type Side = 'top' | 'right' | 'bottom' | 'left';

/**
 * Instant, styled tooltip. Uses position:fixed so it is never clipped by an
 * ancestor's overflow (e.g. the scrollable toolbar). Wrap a single element.
 */
export function Tooltip({ label, side = 'top', children }: { label: string; side?: Side; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    const el = (ref.current?.firstElementChild as HTMLElement) ?? ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (side === 'right') setPos({ x: r.right + 8, y: r.top + r.height / 2 });
    else if (side === 'left') setPos({ x: r.left - 8, y: r.top + r.height / 2 });
    else if (side === 'bottom') setPos({ x: r.left + r.width / 2, y: r.bottom + 8 });
    else setPos({ x: r.left + r.width / 2, y: r.top - 8 });
  };
  const hide = () => setPos(null);

  const transform =
    side === 'right' ? 'translateY(-50%)'
    : side === 'left' ? 'translate(-100%, -50%)'
    : side === 'bottom' ? 'translateX(-50%)'
    : 'translate(-50%, -100%)';

  return (
    <span ref={ref} className="contents" onMouseEnter={show} onMouseLeave={hide} onFocusCapture={show} onBlurCapture={hide}>
      {children}
      {pos && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[1000] whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-bg shadow-lg"
          style={{ left: pos.x, top: pos.y, transform }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
