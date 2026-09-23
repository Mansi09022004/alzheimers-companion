import type { ReactNode } from 'react';

/**
 * Honest empty state — used whenever the backend genuinely has nothing yet.
 * Never replaced with fake data to make a page look populated.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-brand-200 bg-gradient-to-br from-sage-50 via-white to-lavender-50 px-6 py-12 text-center">
      <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-peach-100/60 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-32 w-32 rounded-full bg-lavender-100/60 blur-2xl" />
      <span className="animate-float relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        {icon ?? '—'}
      </span>
      <p className="font-display text-base font-semibold text-ink-800">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-danger-100 bg-danger-50 px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg text-danger-600">
        !
      </span>
      <p className="font-display text-base font-semibold text-danger-700">Something went wrong</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-danger-600/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-danger-700 shadow-sm hover:bg-danger-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}
