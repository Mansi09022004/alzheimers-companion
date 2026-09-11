import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
};

const WIDTH = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Generic dialog. Esc / backdrop-click closes it. */
export function Modal({ open, onClose, title, description, children, width = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`animate-slide-up relative w-full ${WIDTH[width]} rounded-xl bg-white p-6 shadow-popover`}
      >
        <div className="mb-4">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {children}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}
