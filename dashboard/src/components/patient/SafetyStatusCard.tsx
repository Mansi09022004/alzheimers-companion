import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';

import type { Geofence, LatestLocation } from '../../api';
import { CheckIcon, MapPinIcon } from '../ui/icons';

const markerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

function updatedLabel(ageSeconds: number | null): string {
  if (ageSeconds == null) return 'No location received yet';
  if (ageSeconds < 120) return 'Updated just now';
  if (ageSeconds < 3600) return `Last updated ${Math.round(ageSeconds / 60)} minutes ago`;
  if (ageSeconds < 86400) return `Last updated ${Math.round(ageSeconds / 3600)} hours ago`;
  return `Last updated ${Math.round(ageSeconds / 86400)} days ago`;
}

/**
 * Safety, first. This card exists to answer one question in under a second:
 * "is my loved one okay right now" — everything else (coordinates, accuracy,
 * map controls) is secondary and stays visually quiet.
 */
export function SafetyStatusCard({
  patientId,
  firstName,
  loc,
  geofences,
  hasLocationAlert,
}: {
  patientId: number;
  firstName: string;
  loc: LatestLocation | null;
  geofences: Geofence[] | null;
  hasLocationAlert: boolean;
}) {
  const safeZone = geofences?.[0] ?? null;
  const hasFix = !!loc?.point;
  const isSafe = hasFix && !hasLocationAlert;

  const status = isSafe
    ? { headline: `${firstName} is safe`, tone: 'safe' as const }
    : hasLocationAlert
      ? { headline: `${firstName} may need attention`, tone: 'attention' as const }
      : { headline: 'Location unavailable', tone: 'unknown' as const };

  const secondary = isSafe
    ? safeZone
      ? `At ${safeZone.name}`
      : 'Location known'
    : hasLocationAlert
      ? safeZone
        ? `Away from ${safeZone.name}`
        : 'Outside the safe zone'
      : "We haven't heard from their device yet";

  const TONE = {
    safe: { ring: 'bg-sage-100 text-sage-700', dot: 'bg-sage-500', text: 'text-sage-700' },
    attention: { ring: 'bg-warning-50 text-warning-700', dot: 'bg-warning-500', text: 'text-warning-700' },
    unknown: { ring: 'bg-ink-100 text-ink-400', dot: 'bg-ink-300', text: 'text-ink-500' },
  }[status.tone];

  const center: [number, number] = loc?.point
    ? [loc.point.lat, loc.point.lng]
    : safeZone
      ? [safeZone.center_lat, safeZone.center_lng]
      : [20.5937, 78.9629];

  return (
    <div className="overflow-hidden rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-100 to-sage-50 shadow-soft">
      <div className="flex items-start gap-4 p-5">
        <span className={`mt-0.5 flex h-12 w-12 flex-none items-center justify-center rounded-full ${TONE.ring}`}>
          {status.tone === 'safe' ? <CheckIcon width={22} height={22} /> : <MapPinIcon width={20} height={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold leading-tight text-ink-900">{status.headline}</p>
          <p className={`mt-1 text-sm font-medium ${TONE.text}`}>{secondary}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
            <span className={`h-1.5 w-1.5 flex-none rounded-full ${TONE.dot}`} />
            {updatedLabel(loc?.age_seconds ?? null)}
          </p>
        </div>
      </div>

      <div className="relative mx-3 mb-3 h-36 overflow-hidden rounded-2xl border border-ink-100">
        {hasFix || safeZone ? (
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {safeZone && (
              <Circle center={[safeZone.center_lat, safeZone.center_lng]} radius={safeZone.radius_m} pathOptions={{ color: '#367F79', weight: 2, fillOpacity: 0.1 }} />
            )}
            {loc?.point && <Marker position={[loc.point.lat, loc.point.lng]} icon={markerIcon} />}
          </MapContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-ink-50 text-center">
            <MapPinIcon width={18} height={18} className="text-ink-300" />
            <p className="text-xs text-ink-400">No location or safe zone set up yet</p>
          </div>
        )}
        <Link
          to={`/patients/${patientId}/location`}
          className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-600 shadow-soft hover:bg-white"
        >
          View map →
        </Link>
      </div>
    </div>
  );
}
