import { useEffect, useState } from 'react';

import { medications, type DoseSlot, type Medication } from '../../api';
import { DoseRow, MedicationCard } from '../../components/patient/MedicationCard';
import { MedicationDetailModal } from '../../components/patient/MedicationDetailModal';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader, SectionTitle } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field, Input } from '../../components/ui/Input';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { PillIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';
import { usePolling } from '../../lib/usePolling';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MedicationPage() {
  const { patient } = useCurrentPatient();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();

  const [list, setList] = useState<Medication[] | null>(null);
  const [today, setToday] = useState<DoseSlot[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', dosage_note: '', times: '08:00, 20:00' });
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Medication | null>(null);

  const load = () => {
    if (!patient) return;
    medications.list(patient.id).then(setList).catch(() => setList([]));
    medications.today(patient.id).then(setToday).catch(() => setToday([]));
  };
  useEffect(load, [patient]);

  // Doses the patient confirms on their phone should show up here without a reload.
  usePolling(
    () => {
      if (patient) medications.today(patient.id).then(setToday).catch(() => {});
    },
    15_000,
    !!patient,
  );

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setBusy(true);
    try {
      await medications.create(patient.id, {
        name: form.name,
        dosage_note: form.dosage_note || null,
        schedule_times: form.times.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success(`${form.name} scheduled.`);
      setForm({ name: '', dosage_note: '', times: '08:00, 20:00' });
      setAdding(false);
      load();
    } catch {
      toast.error('Could not save that schedule. Check the time format (HH:MM).');
    } finally {
      setBusy(false);
    }
  };

  const removeMed = async (id: number, name: string) => {
    if (!(await confirm({ title: `Remove ${name}?`, description: 'This deletes its schedule and dose history.', confirmLabel: 'Remove' }))) return;
    await medications.remove(id);
    toast.success(`${name} removed.`);
    load();
  };

  const mark = async (slot: DoseSlot, status: 'taken' | 'skipped') => {
    await medications.recordDose(slot.medication_id, slot.time, status, todayISO());
    toast.success(`Marked ${slot.name} (${slot.time}) as ${status}.`);
    load();
  };

  if (!patient) return null;

  return (
    <div>
      {confirmUi}
      <PageHeader title="Medication" subtitle="Today's doses and the schedule." action={<Button onClick={() => setAdding(true)}>+ Add medicine</Button>} />

      <div className="grid gap-6">
        <div className="space-y-6">
          <Card padded={false} tone="brand">
            <div className="p-5 pb-0">
              <SectionTitle>Today</SectionTitle>
            </div>
            <div className="space-y-2.5 p-5 pt-3">
              {!today && <SkeletonRows count={2} height="h-12" />}
              {today?.length === 0 && <EmptyState icon={<PillIcon />} title="No medicines scheduled for today." />}
              {today
                ?.slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((slot) => (
                  <DoseRow
                    key={`${slot.medication_id}-${slot.time}`}
                    time={slot.time}
                    name={slot.name}
                    dosageNote={slot.dosage_note}
                    status={slot.status}
                    onMarkTaken={() => mark(slot, 'taken')}
                    onSkip={() => mark(slot, 'skipped')}
                  />
                ))}
            </div>
          </Card>

          <div>
            <SectionTitle subtitle="Tap a medicine for its full details.">Schedule</SectionTitle>
            {!list && <SkeletonRows count={2} height="h-16" />}
            {list?.length === 0 && <EmptyState icon={<PillIcon />} title="No medications added yet." action={<Button onClick={() => setAdding(true)}>+ Add the first one</Button>} />}
            <div className="space-y-2">
              {list?.map((m) => (
                <MedicationCard key={m.id} medication={m} onOpen={setDetail} onRemove={() => removeMed(m.id, m.name)} />
              ))}
            </div>
          </div>
        </div>

      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a medicine" width="sm">
        <form onSubmit={add} className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Dosage note (optional)">
            <Input value={form.dosage_note} onChange={(e) => setForm({ ...form, dosage_note: e.target.value })} placeholder="5 mg tablet" />
          </Field>
          <Field label="Times" hint="Comma-separated, 24-hour HH:MM">
            <Input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <MedicationDetailModal medication={detail} todaysDoses={today ?? []} onClose={() => setDetail(null)} />
    </div>
  );
}
