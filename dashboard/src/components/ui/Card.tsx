import type { ReactNode } from 'react';

const TONE_BG: Record<string, string> = {
  default: 'bg-white border-black/5',
  brand: 'bg-gradient-to-br from-brand-100 to-brand-50 border-brand-200/70',
  sage: 'bg-gradient-to-br from-sage-100 to-sage-50 border-sage-200/70',
  lavender: 'bg-gradient-to-br from-lavender-100 to-lavender-50 border-lavender-200/70',
  coral: 'bg-gradient-to-br from-coral-100 to-coral-50 border-coral-200/70',
  peach: 'bg-gradient-to-br from-peach-100 to-peach-50 border-peach-200/70',
  gold: 'bg-gradient-to-br from-gold-100 to-gold-50 border-gold-200/70',
  blossom: 'bg-gradient-to-br from-blossom-100 to-blossom-50 border-blossom-200/70',
};

export function Card({
  children,
  className = '',
  padded = true,
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  tone?: keyof typeof TONE_BG;
}) {
  return (
    <div className={`rounded-3xl border shadow-soft ${TONE_BG[tone]} ${padded ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, subtitle }: { children: ReactNode; action?: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-700">{children}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
