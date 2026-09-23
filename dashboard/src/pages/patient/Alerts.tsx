import { useEffect, useMemo, useState } from 'react';

import { alerts, type Alert } from '../../api';
import { AlertCard } from '../../components/patient/AlertCard';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { AlertTriangleIcon } from '../../components/ui/icons';
import { useCurrentPatient } from '../../lib/PatientContext';

type SeverityFilter = 'all' | 'info' | 'warning' | 'critical';

const COLLAPSED_COUNT = 3;

const TYPE_LABEL: Record<Alert['type'], string> = {
  geofence_exit: 'Left safe zone',
  geofence_return: 'Returned to safe zone',
  sos: 'SOS',
  medication_missed: 'Missed medication',
};

export function Alerts() {
  const { patient } = useCurrentPatient();
  const toast = useToast();

  const [list, setList] = useState<Alert[] | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [expanded, setExpanded] = useState(false);

  const load = () => {
    if (!patient) return;
    alerts.list(patient.id, onlyOpen).then(setList).catch(() => setList([]));
  };
  useEffect(load, [patient, onlyOpen]);
  useEffect(() => setExpanded(false), [onlyOpen, severity]);

  const ack = async (id: number) => {
    await alerts.acknowledge(id);
    toast.success('Alert acknowledged.');
    load();
  };

  const filtered = useMemo(() => {
    if (!list) return null;
    return severity === 'all' ? list : list.filter((a) => a.severity === severity);
  }, [list, severity]);

  const visible = expanded ? filtered : filtered?.slice(0, COLLAPSED_COUNT) ?? null;
  const hasMore = (filtered?.length ?? 0) > COLLAPSED_COUNT;

  const counts = useMemo(() => {
    const c = { info: 0, warning: 0, critical: 0 };
    list?.forEach((a) => {
      if (!a.acknowledged_at) c[a.severity]++;
    });
    return c;
  }, [list]);

  if (!patient) return null;

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Geofence breaches, SOS signals, and missed medication — newest first." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                severity === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
              {s !== 'all' && counts[s] > 0 ? ` (${counts[s]})` : ''}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
          Unacknowledged only
        </label>
      </div>

      <Card padded={false}>
        <div className="space-y-2 p-4">
          {!filtered && <SkeletonRows count={4} height="h-16" />}
          {filtered?.length === 0 && <EmptyState icon={<AlertTriangleIcon />} title="No alerts here." description="Geofence breaches, SOS signals, and missed doses will show up here." />}
          {visible?.map((a) => (
            <div key={a.id}>
              <AlertCard alert={{ ...a, reason_text: `${TYPE_LABEL[a.type]} — ${a.reason_text}` }} onAcknowledge={ack} />
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show Less' : 'View All Alerts'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
