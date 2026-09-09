import { useEffect, useState } from 'react';

import { emergency, type Contact } from '../../api';
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../ui';

export function EmergencySection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<Contact[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: '', priority: '5' });

  const load = () => emergency.list(patientId).then(setList);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await emergency.create(patientId, {
      name: form.name,
      phone: form.phone,
      relation: form.relation || null,
      priority: Number(form.priority),
    });
    setForm({ name: '', phone: '', relation: '', priority: '5' });
    setAdding(false);
    load();
  };

  if (!list) return <Spinner />;

  return (
    <div>
      <SectionTitle action={<Button onClick={() => setAdding((a) => !a)}>Add contact</Button>}>
        Emergency contacts
      </SectionTitle>

      {adding && (
        <Card className="mb-4">
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </Field>
            <Field label="Relation">
              <Input
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="son, doctor…"
              />
            </Field>
            <Field label="Priority (1 = called first)">
              <Input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </Field>
            <div className="col-span-2">
              <Button type="submit">Add</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">No emergency contacts.</p>}
        {list.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {c.name} <Badge>#{c.priority}</Badge>
              </div>
              <div className="text-sm text-slate-500">
                {c.phone}
                {c.relation ? ` · ${c.relation}` : ''}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                await emergency.remove(c.id);
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
