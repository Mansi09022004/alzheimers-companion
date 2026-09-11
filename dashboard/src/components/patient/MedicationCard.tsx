import type { Medication } from '../../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TrashIcon } from '../ui/icons';

export function MedicationCard({ medication, onRemove }: { medication: Medication; onRemove?: (id: number) => void }) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <p className="font-medium text-slate-900">
          {medication.name}
          {medication.dosage_note && <span className="ml-1.5 font-normal text-slate-500">· {medication.dosage_note}</span>}
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
      {onRemove && (
        <button
          onClick={() => onRemove(medication.id)}
          className="flex-none rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-danger-500"
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
const DOSE_TONE: Record<string, 'slate' | 'blue' | 'green' | 'red'> = {
  upcoming: 'slate',
  due: 'blue',
  taken: 'green',
  skipped: 'slate',
  missed: 'red',
};

export function DoseRow({
  time,
  name,
  dosageNote,
  status,
}: {
  time: string;
  name: string;
  dosageNote: string | null;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
      <div className="flex items-center gap-3">
        <span className="w-12 flex-none text-sm font-medium text-slate-500">{time}</span>
        <span className="text-sm text-slate-800">
          {name}
          {dosageNote && <span className="text-slate-400"> · {dosageNote}</span>}
        </span>
      </div>
      <Badge tone={DOSE_TONE[status] ?? 'slate'}>{DOSE_LABEL[status] ?? status}</Badge>
    </div>
  );
}
