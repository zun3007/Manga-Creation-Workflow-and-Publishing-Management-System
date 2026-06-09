import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from './Spinner';
import { onToast } from '../../lib/toastBus';

export type ToastType = 'loading' | 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export interface ToastApi {
  /** Show a toast; returns its id (use with update/dismiss). */
  push: (type: ToastType, message: string, opts?: { duration?: number }) => number;
  /** Mutate an existing toast in place (e.g. loading -> success). */
  update: (id: number, type: ToastType, message: string, opts?: { duration?: number }) => void;
  dismiss: (id: number) => void;
  loading: (message: string) => number;
  success: (message: string) => number;
  error: (message: string) => number;
  info: (message: string) => number;
}

const ToastContext = createContext<ToastApi | null>(null);

const NOOP_TOAST: ToastApi = {
  push: () => 0,
  update: () => {},
  dismiss: () => {},
  loading: () => 0,
  success: () => 0,
  error: () => 0,
  info: () => 0,
};

export function useToast(): ToastApi {
  // Falls back to a no-op API so components can render outside a provider (e.g. in unit tests).
  return useContext(ToastContext) ?? NOOP_TOAST;
}

const DEFAULT_MS: Record<ToastType, number> = {
  loading: 0, // sticky until updated/dismissed
  success: 3500,
  error: 6000,
  info: 4000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    const t = timers.current[id];
    if (t) {
      clearTimeout(t);
      delete timers.current[id];
    }
  }, []);

  const schedule = useCallback(
    (id: number, type: ToastType, duration?: number) => {
      const existing = timers.current[id];
      if (existing) clearTimeout(existing);
      const ms = duration ?? DEFAULT_MS[type];
      if (ms > 0) timers.current[id] = setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const push = useCallback(
    (type: ToastType, message: string, opts?: { duration?: number }) => {
      const id = ++idRef.current;
      setItems((xs) => [...xs, { id, type, message }]);
      schedule(id, type, opts?.duration);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: number, type: ToastType, message: string, opts?: { duration?: number }) => {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, type, message } : x)));
      schedule(id, type, opts?.duration);
    },
    [schedule],
  );

  const api: ToastApi = {
    push,
    update,
    dismiss,
    loading: (m) => push('loading', m),
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  // Bridge non-React callers (axios interceptor, etc.) into the toast UI.
  useEffect(() => onToast((type, message) => push(type, message)), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 48, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex items-start gap-3 min-w-[260px] max-w-[380px] rounded-xl border border-line bg-surface px-4 py-3 shadow-lg"
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              <span className="mt-0.5 shrink-0">
                <ToastIcon type={t.type} />
              </span>
              <p className="flex-1 text-sm leading-snug text-ink">{t.message}</p>
              {t.type !== 'loading' && (
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 -mr-1 -mt-0.5 px-1 text-lg leading-none text-ink-soft hover:text-ink"
                  aria-label="Đóng thông báo"
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'loading') return <Spinner size={18} className="text-accent" />;
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
  if (type === 'success')
    return (
      <svg {...common} className="text-emerald-500">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (type === 'error')
    return (
      <svg {...common} className="text-danger">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg {...common} className="text-accent">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5M12 7.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
