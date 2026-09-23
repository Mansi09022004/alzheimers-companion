import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

import { geofences, location, type Geofence, type LatestLocation } from '../../api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader, SectionTitle } from '../../components/ui/Card';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Field, Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/LoadingState';
import { MapPinIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';
import { useToast } from '../../components/ui/Toast';

const markerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Freshness = { label: 'Live' | 'Last known' | 'Unavailable'; tone: 'green' | 'amber' | 'slate'; detail: string };

function freshnessOf(latest: LatestLocation | null): Freshness {
  if (!latest?.point) return { label: 'Unavailable', tone: 'slate', detail: 'No location has been received from the patient device yet.' };
  const s = latest.age_seconds ?? Infinity;
  if (s < 120) return { label: 'Live', tone: 'green', detail: 'Updated in the last 2 minutes.' };
  const detail =
    s < 3600 ? `Last seen ${Math.round(s / 60)} min ago.` : s < 86400 ? `Last seen ${Math.round(s / 3600)} h ago.` : `Last seen ${Math.round(s / 86400)} d ago.`;
  return { label: 'Last known', tone: 'amber', detail };
}

export function Location() {
  const { patient } = useCurrentPatient();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();

  const [latest, setLatest] = useState<LatestLocation | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [zones, setZones] = useState<Geofence[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: 'Home', lat: '', lng: '', radius: '400' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!patient) return;
    location.latest(patient.id).then(setLatest).catch(() => setLatest(null));
    location.history(patient.id, 24).then((h) => setTrail(h.map((p) => [p.lat, p.lng]))).catch(() => setTrail([]));
    geofences.list(patient.id).then(setZones).catch(() => setZones([]));
  };
  useEffect(load, [patient]);
  useEffect(() => {
    if (patient?.home_lat != null && patient?.home_lng != null) {
      setForm((f) => ({ ...f, lat: String(patient.home_lat), lng: String(patient.home_lng) }));
    }
  }, [patient]);

  const addZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setBusy(true);
    try {
      await geofences.create(patient.id, {
        name: form.name,
        center_lat: Number(form.lat),
        center_lng: Number(form.lng),
        radius_m: Number(form.radius),
      });
      toast.success(`Safe zone "${form.name}" added.`);
      setAdding(false);
      load();
    } catch {
      toast.error('Could not save that safe zone. Check the coordinates.');
    } finally {
      setBusy(false);
    }
  };

  const removeZone = async (z: Geofence) => {
    if (!(await confirm({ title: `Delete safe zone "${z.name}"?`, confirmLabel: 'Delete' }))) return;
    await geofences.remove(z.id);
    toast.success('Safe zone removed.');
    load();
  };

  if (!patient) return null;
  if (latest === null && zones === null) return <PageSpinner />;

  const fresh = freshnessOf(latest);
  const center: [number, number] = latest?.point
    ? [latest.point.lat, latest.point.lng]
    : zones?.[0]
      ? [zones[0].center_lat, zones[0].center_lng]
      : [20.5937, 78.9629];

  return (
    <div>
      {confirmUi}
      <PageHeader title="Location" subtitle="Where the patient is, and the safe zones they're tracked against." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card padded={false} tone="sage">
            <div className="flex items-center justify-between border-b border-sage-100 p-4">
              <div className="flex items-center gap-2.5">
                <Badge tone={fresh.tone}>{fresh.label}</Badge>
                <span className="text-sm text-slate-500">{fresh.detail}</span>
              </div>
              {latest?.point?.accuracy_m != null && <span className="text-xs text-slate-400">±{Math.round(latest.point.accuracy_m)} m accuracy</span>}
            </div>
            <div className="h-[28rem] overflow-hidden rounded-b-xl">
              <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {zones?.map((z) => (
                  <Circle key={z.id} center={[z.center_lat, z.center_lng]} radius={z.radius_m} pathOptions={{ color: '#0e7a53', fillOpacity: 0.08 }} />
                ))}
                {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#94a3b8', weight: 3 }} />}
                {latest?.point && <Marker position={[latest.point.lat, latest.point.lng]} icon={markerIcon} />}
              </MapContainer>
            </div>
            <p className="p-4 pt-3 text-xs text-slate-400">Green circles are safe zones. The grey line is the last 24 hours of movement.</p>
          </Card>
        </div>

        <div>
          <SectionTitle action={<Button size="sm" onClick={() => setAdding(true)}>+ Add zone</Button>}>Safe zones</SectionTitle>
          <div className="space-y-2">
            {zones?.length === 0 && (
              <Card className="flex flex-col items-center gap-2 py-8 text-center">
                <MapPinIcon width={22} height={22} className="text-slate-300" />
                <p className="text-sm text-slate-500">No safe zones set yet.</p>
              </Card>
            )}
            {zones?.map((z) => (
              <Card key={z.id} tone="brand" className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-900">
                    {z.name} <Badge tone="green">{z.radius_m} m</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {z.center_lat.toFixed(5)}, {z.center_lng.toFixed(5)}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeZone(z)}>
                  Remove
                </Button>
              </Card>
            ))}
          </div>

          {adding && (
            <Card className="mt-3">
              <form onSubmit={addZone} className="space-y-3">
                <Field label="Name">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Field>
                <Field label="Radius (metres)">
                  <Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} required />
                </Field>
                {latest?.point && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm((f) => ({ ...f, lat: String(latest.point!.lat), lng: String(latest.point!.lng) }))}
                  >
                    <MapPinIcon width={14} height={14} /> Use current location
                  </Button>
                )}
                <Field label="Centre latitude">
                  <Input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
                </Field>
                <Field label="Centre longitude">
                  <Input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
                </Field>
                <p className="text-xs text-slate-400">Tip: use the patient's home coordinates, prefilled above if set.</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={busy}>
                    Add zone
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
