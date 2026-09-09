import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { patients, type Patient } from '../api';
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../ui';

export function Patients() {
  const [list, setList] = useState<Patient[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [homeLabel, setHomeLabel] = useState('');

  const load = () => patients.list().then(setList);
  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await patients.create({ full_name: name, home_label: homeLabel || null });
    setName('');
    setHomeLabel('');
    setAdding(false);
    load();
  };

  if (!list) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <SectionTitle action={<Button onClick={() => setAdding((a) => !a)}>Add patient</Button>}>
        Patients
      </SectionTitle>

      {adding && (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-2 gap-3">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Home label (optional)">
              <Input value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} placeholder="Green Villa" />
            </Field>
            <div className="col-span-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">No patients yet. Add one to begin.</p>}
        {list.map((p) => (
          <Link key={p.id} to={`/patients/${p.id}`}>
            <Card className="flex items-center justify-between transition hover:border-brand-300">
              <div>
                <div className="font-medium text-slate-900">{p.full_name}</div>
                <div className="text-sm text-slate-500">{p.home_label ?? 'No home set'}</div>
              </div>
              <Badge tone={p.my_access === 'owner' ? 'blue' : 'slate'}>{p.my_access}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
