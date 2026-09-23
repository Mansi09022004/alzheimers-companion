import type { Medication } from '../../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CheckIcon, ChevronDownIcon, TrashIcon, XIcon } from '../ui/icons';

export function MedicationCard({
  medication,
  onOpen,
  onRemove,
}: {
  medication: Medication;
  onOpen?: (medication: Medication) => void;
  onRemove?: (id: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-100 to-sage-50 p-4">
      <button onClick={() => onOpen?.(medication)} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
        <div className="min-w-0">
          <p className="font-medium text-ink-900">
            {medication.name}
            {medication.dosage_note && <span className="ml-1.5 font-normal text-ink-500">· {medication.dosage_note}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {medication.schedule_times.map((t) => (
              <Badge key={t} tone="blue">
                {t}
              </Badge>
            ))}
            {!medication.active && <Badge tone="slate">inactive</Badge>}
          </div>
        </div>
        <ChevronDownIcon width={16} height={16} className="flex-none -rotate-90 text-sage-400" />
      </button>
      {onRemove && (
        <button
          onClick={() => onRemove(medication.id)}
          className="flex-none rounded-md p-1.5 text-ink-300 hover:bg-white/70 hover:text-danger-500"
          aria-label={`Remove ${medication.name}`}
        >
          <TrashIcon width={16} height={16} />
        </button>
      )}
    </div>
  );
}

const DOSE_LABEL: Record<string, string> = {
  upcoming: 'Later today',
  due: 'Due now',
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
};
const DOSE_STYLE: Record<string, { row: string; badge: 'slate' | 'blue' | 'green' | 'red'; icon: string }> = {
  upcoming: { row: 'border-ink-100 bg-white/70', badge: 'slate', icon: 'text-ink-400' },
  due: { row: 'border-brand-200 bg-brand-50', badge: 'blue', icon: 'text-brand-600' },
  taken: { row: 'border-success-200 bg-success-50', badge: 'green', icon: 'text-success-600' },
  skipped: { row: 'border-ink-100 bg-white/70', badge: 'slate', icon: 'text-ink-400' },
  missed: { row: 'border-danger-200 bg-danger-50', badge: 'red', icon: 'text-danger-600' },
};

export function DoseRow({
  time,
  name,
  dosageNote,
  status,
  onMarkTaken,
  onSkip,
}: {
  time: string;
  name: string;
  dosageNote: string | null;
  status: string;
  onMarkTaken?: () => void;
  onSkip?: () => void;
}) {
  const style = DOSE_STYLE[status] ?? DOSE_STYLE.upcoming;
  const actionable = status === 'due' || status === 'upcoming' || status === 'missed';

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 ${style.row}`}>
      <div className="flex flex-none flex-col items-center justify-center rounded-xl bg-white/80 px-2.5 py-1.5 text-center">
        <span className="text-sm font-bold text-ink-800">{time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">
          {name}
          {dosageNote && <span className="font-normal text-ink-500"> · {dosageNote}</span>}
        </p>
        <Badge tone={style.badge}>{DOSE_LABEL[status] ?? status}</Badge>
      </div>
      {actionable && (onMarkTaken || onSkip) && (
        <div className="flex flex-none gap-1.5">
          {onMarkTaken && (
            <Button size="sm" onClick={onMarkTaken}>
              <CheckIcon width={13} height={13} /> Mark as taken
            </Button>
          )}
          {onSkip && (
            <Button size="sm" variant="ghost" onClick={onSkip}>
              <XIcon width={13} height={13} /> Skip
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
