import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
};

type ConfirmResolve = {
  resolve: (value: boolean) => void;
};

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const NOOP_CONFIRM: ConfirmContextValue = {
  confirm: () => Promise.resolve(true),
};

export function useConfirm(): { confirm: (opts: ConfirmOptions) => Promise<boolean> } {
  return useContext(ConfirmContext) ?? NOOP_CONFIRM;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<ConfirmResolve | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending(opts);
      setResolveRef({ resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolveRef) {
      resolveRef.resolve(false);
      setResolveRef(null);
    }
    setPending(null);
  }, [resolveRef]);

  const handleConfirm = useCallback(() => {
    if (resolveRef) {
      resolveRef.resolve(true);
      setResolveRef(null);
    }
    setPending(null);
  }, [resolveRef]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <ConfirmDialog
          open={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          options={pending}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  options,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  options: ConfirmOptions;
}) {
  const confirmButtonVariant = options.tone === 'danger' ? 'accent' : 'accent';
  const confirmButtonClassName = options.tone === 'danger' ? 'bg-danger text-white hover:brightness-95' : '';

  return (
    <Modal open={open} onClose={onClose} title={options.title} className="w-full max-w-sm">
      <div className="p-6">
        {options.body && <p className="text-sm text-ink-soft mb-6">{options.body}</p>}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>
            {options.cancelText ?? 'Hủy'}
          </Button>
          <Button
            variant={confirmButtonVariant}
            className={confirmButtonClassName}
            onClick={onConfirm}
          >
            {options.confirmText ?? 'Xác nhận'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
