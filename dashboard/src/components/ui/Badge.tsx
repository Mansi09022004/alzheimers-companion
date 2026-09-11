import type { ReactNode } from 'react';

type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue';

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-success-50 text-success-700',
  amber: 'bg-warning-50 text-warning-700',
  red: 'bg-danger-50 text-danger-700',
  blue: 'bg-brand-50 text-brand-700',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** A dot + label — for safety/adherence/connection status. */
export function StatusPill({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  const dot: Record<Tone, string> = {
    slate: 'bg-slate-400',
    green: 'bg-success-500',
    amber: 'bg-warning-500',
    red: 'bg-danger-500',
    blue: 'bg-brand-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
      {children}
    </span>
  );
}
