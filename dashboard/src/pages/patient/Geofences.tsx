import { useEffect, useState } from 'react';

import { geofences, patients, type Geofence } from '../../api';
import { Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../ui';

export function GeofencesSection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<Geofence[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: 'Home', lat: '', lng: '', radius: '400' });

  const load = () => geofences.list(patientId).then(setList);
  useEffect(() => {
    load();
    // prefill from the patient's home coordinates if set
    patients.get(patientId).then((p) => {
      if (p.home_lat != null && p.home_lng != null) {
        setForm((f) => ({ ...f, lat: String(p.home_lat), lng: String(p.home_lng) }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await geofences.create(patientId, {
      name: form.name,
      center_lat: Number(form.lat),
      center_lng: Number(form.lng),
      radius_m: Number(form.radius),
    });
    setAdding(false);
    load();
  };

  if (!list) return <Spinner />;

  return (
    <div>
      <SectionTitle action={<Button onClick={() => setAdding((a) => !a)}>Add safe zone</Button>}>
        Safe zones
      </SectionTitle>

      {adding && (
        <Card className="mb-4">
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Radius (metres)">
              <Input
                type="number"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: e.target.value })}
                required
              />
            </Field>
            <Field label="Centre latitude">
              <Input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
            </Field>
            <Field label="Centre longitude">
              <Input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
            </Field>
            <div className="col-span-2 text-xs text-slate-400">
              Tip: pick a point on the Location map, or use the patient's home coordinates.
            </div>
            <div className="col-span-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-slate-500">No safe zones set.</p>}
        {list.map((z) => (
          <Card key={z.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">
                {z.name} <Badge tone="blue">{z.radius_m} m</Badge>
              </div>
              <div className="text-xs text-slate-500">
                {z.center_lat.toFixed(5)}, {z.center_lng.toFixed(5)}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={async () => {
                if (confirm(`Delete safe zone "${z.name}"?`)) {
                  await geofences.remove(z.id);
                  load();
                }
              }}
            >
              Delete
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
