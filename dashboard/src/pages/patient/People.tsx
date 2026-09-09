import { useEffect, useState } from 'react';

import { people, type Person } from '../../api';
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../ui';

export function PeopleSection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<Person[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ display_name: '', relationship_label: '', short_bio: '' });

  const load = () => people.list(patientId).then(setList);
  useEffect(() => {
    load();
  }, [patientId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await people.create(patientId, {
      display_name: form.display_name,
      relationship_label: form.relationship_label,
      short_bio: form.short_bio || null,
    });
    setForm({ display_name: '', relationship_label: '', short_bio: '' });
    setAdding(false);
    load();
  };

  if (!list) return <Spinner />;

  return (
    <div>
      <SectionTitle action={<Button onClick={() => setAdding((a) => !a)}>Add person</Button>}>
        Family & friends
      </SectionTitle>

      {adding && (
        <Card className="mb-4">
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                required
              />
            </Field>
            <Field label="Relationship to patient">
              <Input
                value={form.relationship_label}
                onChange={(e) => setForm({ ...form, relationship_label: e.target.value })}
                placeholder="son, wife, neighbour…"
                required
              />
            </Field>
            <div className="col-span-2">
              <Field label="Short note (optional)">
                <Input
                  value={form.short_bio}
                  onChange={(e) => setForm({ ...form, short_bio: e.target.value })}
                  placeholder="Lives in Pune, visits on Sundays"
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Button type="submit">Add</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">No people registered yet.</p>}
        {list.map((p) => (
          <Card key={p.id} className="flex items-start justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {p.display_name} <Badge tone="blue">{p.relationship_label}</Badge>
              </div>
              {p.short_bio && <div className="mt-0.5 text-sm text-slate-500">{p.short_bio}</div>}
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                if (confirm(`Remove ${p.display_name}? This also deletes their face data and memories.`)) {
                  await people.remove(p.id);
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
  );
}
