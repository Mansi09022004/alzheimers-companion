import type { DoseSlot, Medication } from '../../api';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { PillIcon } from '../ui/icons';

const STATUS_LABEL: Record<DoseSlot['status'], string> = {
  taken: 'Taken',
  due: 'Due now',
  upcoming: 'Later today',
  missed: 'Missed',
  skipped: 'Skipped',
};
const STATUS_TONE: Record<DoseSlot['status'], 'slate' | 'blue' | 'green' | 'red'> = {
  taken: 'green',
  due: 'blue',
  upcoming: 'slate',
  missed: 'red',
  skipped: 'slate',
};

/** Everything known about one medicine — name, dosage, schedule, and today's
 * status for each of its doses. No adherence-per-medicine number here: the
 * backend only tracks adherence across all medicines together, so we show
 * what the data actually supports rather than approximate it. */
export function MedicationDetailModal({
  medication,
  todaysDoses,
  onClose,
}: {
  medication: Medication | null;
  todaysDoses: DoseSlot[];
  onClose: () => void;
}) {
  if (!medication) return null;
  const mine = todaysDoses.filter((d) => d.medication_id === medication.id);

  return (
    <Modal open={!!medication} onClose={onClose} title={medication.name} width="sm">
      <div className="-mt-2 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-sage-50 p-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-sage-500 text-white">
            <PillIcon width={18} height={18} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{medication.name}</p>
            <p className="text-sm text-ink-500">{medication.dosage_note || 'No dosage note added.'}</p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Frequency &amp; scheduled times</p>
          <div className="flex flex-wrap gap-1.5">
            {medication.schedule_times.map((t) => (
              <Badge key={t} tone="blue">
                {t}
              </Badge>
            ))}
            <span className="self-center text-xs text-ink-400">
              {medication.schedule_times.length} dose{medication.schedule_times.length === 1 ? '' : 's'} per day
            </span>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Today's status</p>
          {mine.length === 0 ? (
            <p className="text-sm text-ink-400">Not scheduled for today.</p>
          ) : (
            <div className="space-y-1.5">
              {mine
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((d) => (
                  <div key={d.time} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                    <span className="font-medium text-ink-700">{d.time}</span>
                    <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  </div>
                ))}
            </div>
          )}
        </div>

        {!medication.active && (
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs font-medium text-warning-700">
            This medicine is marked inactive — it won't appear in today's schedule.
          </p>
        )}
      </div>
    </Modal>
  );
}
