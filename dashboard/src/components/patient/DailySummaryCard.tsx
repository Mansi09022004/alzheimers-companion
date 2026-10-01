import type { ReactNode } from 'react';

import { Card, SectionTitle } from '../ui/Card';
import { AlertTriangleIcon, CheckIcon, EditIcon, MapPinIcon, PillIcon, UsersIcon } from '../ui/icons';

/** One scannable line: icon, label, and the number that matters — not a replacement
 * for the fuller sections elsewhere on the page, just the headline figure. */
function Row({ icon, label, value, note, tone = 'default' }: { icon: ReactNode; label: string; value: string; note?: string; tone?: 'default' | 'warning' | 'danger' }) {
  const valueColor = tone === 'danger' ? 'text-danger-600' : tone === 'warning' ? 'text-gold-600' : 'text-ink-900';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/70 text-ink-500">{icon}</span>
      <span className="min-w-0 flex-1 text-sm text-ink-600">{label}</span>
      <span className={`flex-none text-right text-sm font-semibold ${valueColor}`}>
        {value}
        {note && <span className="block text-xs font-normal text-ink-400">{note}</span>}
      </span>
    </div>
  );
}

export function DailySummaryCard({
  firstName,
  medicines,
  tasks,
  journalEntriesToday,
  scheduleToday,
  safeZoneText,
  safeZoneOk,
  alertsToday,
}: {
  firstName: string;
  medicines: { taken: number; pending: number; missed: number; total: number } | null;
  tasks: { completed: number; total: number } | null;
  journalEntriesToday: number | null;
  scheduleToday: string[] | null;
  safeZoneText: string;
  safeZoneOk: boolean;
  alertsToday: number | null;
}) {
  return (
    <Card tone="peach">
      <SectionTitle subtitle="One quick scan of the day so far.">{firstName}'s Day — Today</SectionTitle>
      <div className="divide-y divide-ink-900/5">
        <Row
          icon={<PillIcon width={16} height={16} />}
          label="Medicines"
          value={medicines ? `${medicines.taken}/${medicines.total} taken` : '…'}
          note={medicines && medicines.missed > 0 ? `${medicines.missed} missed` : undefined}
          tone={medicines && medicines.missed > 0 ? 'danger' : 'default'}
        />
        <Row
          icon={<CheckIcon width={16} height={16} />}
          label="Tasks"
          value={tasks ? `${tasks.completed}/${tasks.total} completed` : '…'}
        />
        <Row
          icon={<EditIcon width={16} height={16} />}
          label="Journal"
          value={journalEntriesToday === null ? '…' : journalEntriesToday === 0 ? 'No entries' : `${journalEntriesToday} ${journalEntriesToday === 1 ? 'entry' : 'entries'}`}
        />
        <Row
          icon={<UsersIcon width={16} height={16} />}
          label="Today's schedule"
          value={scheduleToday === null ? '…' : scheduleToday.length === 0 ? 'Nothing scheduled' : `${scheduleToday.length} ${scheduleToday.length === 1 ? 'item' : 'items'}`}
          note={scheduleToday && scheduleToday.length > 0 ? scheduleToday.join(', ') : undefined}
        />
        <Row
          icon={<MapPinIcon width={16} height={16} />}
          label="Safe zone"
          value={safeZoneText}
          tone={safeZoneOk ? 'default' : 'warning'}
        />
        <Row
          icon={<AlertTriangleIcon width={16} height={16} />}
          label="Alerts"
          value={alertsToday === null ? '…' : alertsToday === 0 ? 'None' : String(alertsToday)}
          tone={alertsToday && alertsToday > 0 ? 'warning' : 'default'}
        />
      </div>
    </Card>
  );
}
