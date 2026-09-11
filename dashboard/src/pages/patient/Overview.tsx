import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  alerts as alertsApi,
  location as locationApi,
  medications as medsApi,
  memories as memoriesApi,
  routine as routineApi,
  type Adherence,
  type Alert,
  type LatestLocation,
  type Memory,
  type RoutineItem,
} from '../../api';
import { AlertCard } from '../../components/patient/AlertCard';
import { StatusCard } from '../../components/patient/StatusCard';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader, SectionTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { BellIcon, MapPinIcon, MemoryIcon, PillIcon, PlusIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';

function ageLabel(seconds: number | null): string {
  if (seconds == null) return 'Unavailable';
  if (seconds < 90) return 'Live';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

export function Overview() {
  const { patient } = useCurrentPatient();
  const toast = useToast();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [loc, setLoc] = useState<LatestLocation | null>(null);
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [recentMemories, setRecentMemories] = useState<Memory[] | null>(null);
  const [routineToday, setRoutineToday] = useState<RoutineItem[] | null>(null);

  useEffect(() => {
    if (!patient) return;
    alertsApi.list(patient.id, true).then(setAlerts).catch(() => setAlerts([]));
    locationApi.latest(patient.id).then(setLoc).catch(() => setLoc({ point: null, age_seconds: null }));
    medsApi.adherence(patient.id, 1).then(setAdherence).catch(() => setAdherence(null));
    memoriesApi.list(patient.id, 'approved').then((m) => setRecentMemories(m.slice(0, 3))).catch(() => setRecentMemories([]));
    routineApi
      .list(patient.id)
      .then((items) => setRoutineToday(items.filter((r) => r.active && r.days_of_week.includes(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1))))
      .catch(() => setRoutineToday([]));
  }, [patient]);

  if (!patient) return null;

  const safety =
    alerts && alerts.some((a) => a.severity === 'critical')
      ? { tone: 'red' as const, label: 'Needs attention' }
      : alerts && alerts.length > 0
        ? { tone: 'amber' as const, label: `${alerts.length} open alert${alerts.length > 1 ? 's' : ''}` }
        : { tone: 'green' as const, label: 'All clear' };

  const ack = async (id: number) => {
    await alertsApi.acknowledge(id);
    setAlerts((prev) => prev?.filter((a) => a.id !== id) ?? null);
    toast.success('Alert acknowledged.');
  };

  return (
    <div>
      <PageHeader
        title={`Hello, ${patient.full_name.split(' ')[0]}'s care team`}
        subtitle="Here's what's happening today."
      />

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard icon={<BellIcon width={18} height={18} />} label="Safety" value={safety.label} tone={safety.tone} />
        <StatusCard
          icon={<MapPinIcon width={18} height={18} />}
          label="Location"
          value={loc?.point ? ageLabel(loc.age_seconds) : loc ? 'Unavailable' : '…'}
          hint={loc?.point ? (loc.age_seconds != null && loc.age_seconds < 90 ? 'Live' : 'Last known') : undefined}
          tone={loc?.point ? (loc.age_seconds != null && loc.age_seconds < 3600 ? 'green' : 'amber') : 'slate'}
        />
        <StatusCard
          icon={<PillIcon width={18} height={18} />}
          label="Medicine today"
          value={adherence ? `${adherence.taken}/${adherence.taken + adherence.missed + adherence.days[0]?.upcoming || 0}` : '…'}
          hint={adherence ? `${adherence.missed} missed` : undefined}
          tone={adherence && adherence.missed > 0 ? 'amber' : 'green'}
        />
        <StatusCard
          icon={<MemoryIcon width={18} height={18} />}
          label="Approved memories"
          value={recentMemories ? recentMemories.length : '…'}
          hint="most recent"
          tone="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card padded={false}>
            <div className="p-5 pb-0">
              <SectionTitle
                action={
                  <Link to={`/patients/${patient.id}/alerts`} className="text-xs font-medium text-brand-600 hover:underline">
                    View all
                  </Link>
                }
              >
                Recent alerts
              </SectionTitle>
            </div>
            <div className="space-y-2 p-5 pt-3">
              {!alerts && <SkeletonRows count={2} height="h-16" />}
              {alerts && alerts.length === 0 && (
                <EmptyState icon={<BellIcon />} title="No open alerts" description="Geofence exits and SOS presses will show up here." />
              )}
              {alerts?.slice(0, 4).map((a) => (
                <AlertCard key={a.id} alert={a} onAcknowledge={ack} />
              ))}
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-5 pb-0">
              <SectionTitle
                action={
                  <Link to={`/patients/${patient.id}/memories`} className="text-xs font-medium text-brand-600 hover:underline">
                    View all
                  </Link>
                }
              >
                Recent memories
              </SectionTitle>
            </div>
            <div className="space-y-2 p-5 pt-3">
              {!recentMemories && <SkeletonRows count={2} height="h-14" />}
              {recentMemories?.length === 0 && (
                <EmptyState icon={<MemoryIcon />} title="No memories yet" description="Add a memory so the assistant can talk about it." />
              )}
              {recentMemories?.map((m) => (
                <div key={m.id} className="rounded-lg border border-slate-100 p-3 text-sm text-slate-700">
                  {m.text}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle>Quick actions</SectionTitle>
            <div className="space-y-2">
              <Link to={`/patients/${patient.id}/memories?add=1`}>
                <Button variant="ghost" className="w-full justify-start">
                  <PlusIcon width={16} height={16} /> Add a memory
                </Button>
              </Link>
              <Link to={`/patients/${patient.id}/settings`}>
                <Button variant="ghost" className="w-full justify-start">
                  <PlusIcon width={16} height={16} /> Pair a device
                </Button>
              </Link>
              <Link to={`/patients/${patient.id}/medication`}>
                <Button variant="ghost" className="w-full justify-start">
                  <PillIcon width={16} height={16} /> Manage medicines
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <SectionTitle>Today's routine</SectionTitle>
            {!routineToday && <SkeletonRows count={2} height="h-10" />}
            {routineToday?.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled today.</p>}
            <div className="space-y-2">
              {routineToday?.sort((a, b) => a.time_of_day.localeCompare(b.time_of_day)).map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 text-sm">
                  <span className="font-medium text-slate-500">{r.time_of_day}</span>
                  <span className="text-slate-700">{r.title}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
