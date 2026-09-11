/**
 * Toast notifications — success/error feedback after an action.
 *
 * `useToast()` gives `{ success(msg), error(msg), info(msg) }`. Toasts stack
 * top-right, auto-dismiss, and can be closed early.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);

const STYLES: Record<ToastKind, string> = {
  success: 'border-success-500/30 bg-success-50 text-success-700',
  error: 'border-danger-500/30 bg-danger-50 text-danger-700',
  info: 'border-brand-500/30 bg-brand-50 text-brand-700',
};

const ICON: Record<ToastKind, string> = { success: '✓', error: '!', info: 'i' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium shadow-popover ${STYLES[t.kind]}`}
          >
            <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-current/15 text-[11px] font-bold">
              {ICON[t.kind]}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-current/50 hover:text-current"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}
