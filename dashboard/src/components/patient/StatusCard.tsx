import type { ReactNode } from 'react';

import { Card } from '../ui/Card';

const TONE_BG = {
  slate: 'bg-slate-100 text-slate-500',
  green: 'bg-success-50 text-success-600',
  amber: 'bg-warning-50 text-warning-600',
  red: 'bg-danger-50 text-danger-600',
  blue: 'bg-brand-50 text-brand-600',
} as const;

/** A single KPI tile for the dashboard overview row (safety, location, adherence…). */
export function StatusCard({
  icon,
  label,
  value,
  hint,
  tone = 'slate',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof TONE_BG;
}) {
  return (
    <Card className="flex items-start gap-3">
      <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${TONE_BG[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}
