import { useEffect, useState } from 'react';

import { routine as routineApi, type RoutineItem } from '../../api';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { ClockIcon, TrashIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function cadenceText(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Every day';
  if (sorted.join(',') === '0,1,2,3,4') return 'Weekdays';
  if (sorted.join(',') === '5,6') return 'Weekends';
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

export function RoutinePage() {
  const { patient } = useCurrentPatient();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();

  const [list, setList] = useState<RoutineItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', time_of_day: '09:00', days: [...ALL_DAYS], notes: '' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!patient) return;
    routineApi.list(patient.id).then(setList).catch(() => setList([]));
  };
  useEffect(load, [patient]);

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort((a, b) => a - b),
    }));
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || form.days.length === 0) return;
    setBusy(true);
    try {
      await routineApi.create(patient.id, {
        title: form.title,
        time_of_day: form.time_of_day,
        days_of_week: form.days,
        notes: form.notes.trim() || null,
      });
      toast.success(`${form.title} added — it's on the patient's app now.`);
      setForm({ title: '', time_of_day: '09:00', days: [...ALL_DAYS], notes: '' });
      setAdding(false);
      load();
    } catch {
      toast.error('Could not save that routine.');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (item: RoutineItem) => {
    if (
      !(await confirm({
        title: `Remove ${item.title}?`,
        description: 'This removes it from the daily routine and from My Routines on the patient app.',
        confirmLabel: 'Remove',
      }))
    )
      return;
    await routineApi.remove(item.id);
    toast.success(`${item.title} removed.`);
    load();
  };

  if (!patient) return null;

  return (
    <div>
      {confirmUi}
      <PageHeader
        title="Routine"
        subtitle="Define the patient's daily routine — it appears right away under My Routines on their app, no history needed."
        action={<Button onClick={() => setAdding(true)}>+ Add routine</Button>}
      />

      <div className="space-y-3">
        {!list && <SkeletonRows count={3} height="h-16" />}
        {list?.length === 0 && (
          <EmptyState
            icon={<ClockIcon />}
            title="No routines set up yet."
            description="Add one, like a morning walk or an evening call, and it shows up immediately on the patient's app."
            action={<Button onClick={() => setAdding(true)}>+ Add the first one</Button>}
          />
        )}
        {list
          ?.slice()
          .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))
          .map((item) => (
            <Card key={item.id} padded={false} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{item.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {item.time_of_day} · {cadenceText(item.days_of_week)}
                  </p>
                  {item.notes && <p className="mt-1.5 text-sm text-ink-400">{item.notes}</p>}
                </div>
                <button
                  onClick={() => removeItem(item)}
                  className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-cream-100 hover:text-danger-500"
                  aria-label={`Remove ${item.title}`}
                >
                  <TrashIcon width={18} height={18} />
                </button>
              </div>
            </Card>
          ))}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a routine" width="sm">
        <form onSubmit={add} className="space-y-3">
          <Field label="Activity">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Garden walk" required autoFocus />
          </Field>
          <Field label="Time">
            <Input
              type="time"
              value={form.time_of_day}
              onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
              required
            />
          </Field>
          <Field label="Days">
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    form.days.includes(d)
                      ? 'border-brand-400 bg-brand-100 text-brand-700'
                      : 'border-ink-200 text-ink-500 hover:bg-cream-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.days.length === 0 && <span className="block text-xs text-danger-500">Pick at least one day.</span>}
          </Field>
          <Field label="Notes (optional)">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="She enjoys the roses near the gate."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={form.days.length === 0}>
              Add
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
