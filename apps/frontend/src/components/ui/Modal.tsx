import { useEffect, useRef, type ReactNode } from 'react';
import { Panel } from './Panel';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, labelledBy, children, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      // Restore focus when closing
      if (previousActiveRef.current) {
        previousActiveRef.current.focus();
        previousActiveRef.current = null;
      }
      // Restore body overflow
      document.body.style.overflow = '';
      return;
    }

    // Save the currently focused element
    previousActiveRef.current = document.activeElement as HTMLElement;

    // Lock body overflow
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog after render
    if (dialogRef.current) {
      // Find the first focusable element
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      } else {
        // Fall back to the dialog itself
        dialogRef.current.focus();
      }
    }

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Handle Tab trapping
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
          // Shift+Tab
          if (activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = () => {
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        aria-labelledby={labelledBy || undefined}
        tabIndex={-1}
        onClick={handleContentClick}
      >
        <Panel className={`max-w-[90vw] max-h-[90vh] overflow-auto ${className}`}>
          {children}
        </Panel>
      </div>
    </div>
  );
}
