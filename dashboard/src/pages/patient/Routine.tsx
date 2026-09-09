import { useEffect, useState } from 'react';

import { routine, type RoutineItem } from '../../api';
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function RoutineSection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<RoutineItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const load = () => routine.list(patientId).then(setList);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length === 0) return;
    await routine.create(patientId, { title, time_of_day: time, days_of_week: days });
    setTitle('');
    setTime('09:00');
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setAdding(false);
    load();
  };

  if (!list) return <Spinner />;

  return (
    <div>
      <SectionTitle action={<Button onClick={() => setAdding((a) => !a)}>Add item</Button>}>
        Daily routine
      </SectionTitle>

      {adding && (
        <Card className="mb-4">
          <form onSubmit={add} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="What">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short walk" required />
              </Field>
              <Field label="Time">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </Field>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Days</span>
              <div className="mt-1 flex gap-1">
                {DAYS.map((label, i) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => toggleDay(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      days.includes(i) ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit">Add</Button>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">No routine set.</p>}
        {list.map((it) => (
          <Card key={it.id} className="flex items-start justify-between">
            <div>
              <div className="font-medium text-slate-900">
                <span className="text-slate-500">{it.time_of_day}</span> {it.title}
              </div>
              <div className="mt-1 flex gap-1">
                {it.days_of_week.map((d) => (
                  <Badge key={d}>{DAYS[d]}</Badge>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                await routine.remove(it.id);
                load();
              }}
            >
              Remove
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
