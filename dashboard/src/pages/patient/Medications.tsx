import { useEffect, useState } from 'react';

import { medications, type Adherence, type Medication } from '../../api';
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../ui';

export function MedicationsSection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<Medication[] | null>(null);
  const [adh, setAdh] = useState<Adherence | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', dosage_note: '', times: '08:00, 20:00' });

  const load = () => {
    medications.list(patientId).then(setList);
    medications.adherence(patientId, 14).then(setAdh);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await medications.create(patientId, {
      name: form.name,
      dosage_note: form.dosage_note || null,
      schedule_times: form.times.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setForm({ name: '', dosage_note: '', times: '08:00, 20:00' });
    setAdding(false);
    load();
  };

  if (!list) return <Spinner />;

  return (
    <div className="space-y-5">
      {adh && (
        <Card>
          <SectionTitle>Adherence — last 14 days</SectionTitle>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl font-semibold text-slate-900">
                {Math.round(adh.adherence_rate * 100)}%
              </div>
              <div className="text-xs text-slate-500">
                {adh.taken} taken · {adh.missed} missed · {adh.skipped} skipped
              </div>
            </div>
            <div className="flex flex-1 items-end gap-1" style={{ height: 56 }}>
              {adh.days.map((d) => {
                const total = d.taken + d.missed + d.skipped + d.upcoming || 1;
                return (
                  <div key={d.date} className="flex-1" title={d.date}>
                    <div
                      className="w-full rounded-sm bg-green-500"
                      style={{ height: `${(d.taken / total) * 48}px` }}
                    />
                    <div
                      className="w-full rounded-sm bg-red-400"
                      style={{ height: `${(d.missed / total) * 48}px` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div>
        <SectionTitle action={<Button onClick={() => setAdding((a) => !a)}>Add medication</Button>}>
          Schedule
        </SectionTitle>

        {adding && (
          <Card className="mb-4">
            <form onSubmit={add} className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Dosage note">
                <Input
                  value={form.dosage_note}
                  onChange={(e) => setForm({ ...form, dosage_note: e.target.value })}
                  placeholder="5 mg tablet"
                />
              </Field>
              <div className="col-span-2">
                <Field label="Times (comma separated, HH:MM)">
                  <Input value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} required />
                </Field>
              </div>
              <div className="col-span-2">
                <Button type="submit">Add</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-2">
          {list.length === 0 && <p className="text-sm text-slate-500">No medications scheduled.</p>}
          {list.map((m) => (
            <Card key={m.id} className="flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-900">
                  {m.name} {m.dosage_note && <span className="text-sm text-slate-500">· {m.dosage_note}</span>}
                </div>
                <div className="mt-1 flex gap-1.5">
                  {m.schedule_times.map((t) => (
                    <Badge key={t} tone="blue">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (confirm(`Remove ${m.name}?`)) {
                    await medications.remove(m.id);
                    load();
                  }
                }}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
