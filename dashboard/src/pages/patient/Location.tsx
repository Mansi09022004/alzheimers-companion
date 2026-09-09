import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';

import { geofences, location, type Geofence, type LatestLocation } from '../../api';
import { Card, Spinner } from '../../ui';

// Leaflet's default marker icons don't resolve under a bundler — point them at the CDN.
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ageLabel(seconds: number | null): string {
  if (seconds == null) return 'no location yet';
  if (seconds < 90) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
}

export function LocationSection({ patientId }: { patientId: number }) {
  const [latest, setLatest] = useState<LatestLocation | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [zones, setZones] = useState<Geofence[]>([]);

  useEffect(() => {
    location.latest(patientId).then(setLatest);
    location.history(patientId, 24).then((h) => setTrail(h.map((p) => [p.lat, p.lng])));
    geofences.list(patientId).then(setZones);
  }, [patientId]);

  if (!latest) return <Spinner />;

  const center: [number, number] = latest.point
    ? [latest.point.lat, latest.point.lng]
    : zones[0]
      ? [zones[0].center_lat, zones[0].center_lng]
      : [12.9716, 77.5946];

  return (
    <Card>
      <div className="mb-3 text-sm">
        {latest.point ? (
          <span className="text-slate-700">
            Last seen <strong>{ageLabel(latest.age_seconds)}</strong>
            {latest.point.accuracy_m ? ` · ±${Math.round(latest.point.accuracy_m)} m` : ''}
          </span>
        ) : (
          <span className="text-slate-500">No location received yet from the patient device.</span>
        )}
      </div>

      <div className="h-96 overflow-hidden rounded-lg">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {zones.map((z) => (
            <Circle
              key={z.id}
              center={[z.center_lat, z.center_lng]}
              radius={z.radius_m}
              pathOptions={{ color: '#1d6fb8', fillOpacity: 0.08 }}
            />
          ))}
          {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#94a3b8', weight: 3 }} />}
          {latest.point && <Marker position={[latest.point.lat, latest.point.lng]} icon={icon} />}
        </MapContainer>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Blue circles are safe zones. The grey line is the last 24 hours of movement.
      </p>
    </Card>
  );
}
