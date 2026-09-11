import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { alerts as alertsApi, location as locationApi, type Patient } from '../../api';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { StatusPill } from '../ui/Badge';
import { MapPinIcon } from '../ui/icons';

function ageLabel(seconds: number | null): string {
  if (seconds == null) return 'Unavailable';
  if (seconds < 90) return 'Live · just now';
  if (seconds < 3600) return `Last known · ${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `Last known · ${Math.round(seconds / 3600)} h ago`;
  return `Last known · ${Math.round(seconds / 86400)} d ago`;
}

export function PatientCard({ patient }: { patient: Patient }) {
  const [unackCount, setUnackCount] = useState<number | null>(null);
  const [locationAge, setLocationAge] = useState<number | null | 'none'>(null);
  const [hasCritical, setHasCritical] = useState(false);

  useEffect(() => {
    let cancelled = false;
    alertsApi
      .list(patient.id, true)
      .then((rows) => {
        if (cancelled) return;
        setUnackCount(rows.length);
        setHasCritical(rows.some((a) => a.severity === 'critical'));
      })
      .catch(() => !cancelled && setUnackCount(null));
    locationApi
      .latest(patient.id)
      .then((res) => !cancelled && setLocationAge(res.point ? res.age_seconds : 'none'))
      .catch(() => !cancelled && setLocationAge('none'));
    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  const safety = hasCritical
    ? { tone: 'red' as const, label: 'Needs attention' }
    : unackCount && unackCount > 0
      ? { tone: 'amber' as const, label: `${unackCount} open alert${unackCount > 1 ? 's' : ''}` }
      : { tone: 'green' as const, label: 'All clear' };

  return (
    <Link to={`/patients/${patient.id}/dashboard`}>
      <Card className="flex items-center gap-4 transition hover:border-brand-300 hover:shadow-popover">
        <Avatar name={patient.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-slate-900">{patient.full_name}</p>
            {patient.my_access === 'owner' && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">owner</span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
            <MapPinIcon width={14} height={14} />
            {locationAge === 'none' ? 'Location unavailable' : locationAge === null ? '…' : ageLabel(locationAge)}
          </p>
          <div className="mt-2">
            <StatusPill tone={safety.tone}>{safety.label}</StatusPill>
          </div>
        </div>
      </Card>
    </Link>
  );
}
