// Tiny pub/sub so non-React code (e.g. the axios interceptor) can raise app toasts.
export type ToastKind = 'loading' | 'success' | 'error' | 'info';
type Listener = (type: ToastKind, message: string) => void;

const listeners = new Set<Listener>();

export function onToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitToast(type: ToastKind, message: string): void {
  listeners.forEach((fn) => fn(type, message));
}
