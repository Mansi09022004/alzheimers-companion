import { useEffect, useState } from 'react';

import { alerts, type Alert } from '../../api';
import { Badge, Button, Card, SectionTitle, Spinner } from '../../ui';

const TONE = { info: 'blue', warning: 'amber', critical: 'red' } as const;

export function AlertsSection({ patientId }: { patientId: number }) {
  const [list, setList] = useState<Alert[] | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);

  const load = () => alerts.list(patientId, onlyOpen).then(setList);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, onlyOpen]);

  const ack = async (id: number) => {
    await alerts.acknowledge(id);
    load();
  };

  return (
    <div>
      <SectionTitle
        action={
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Unacknowledged only
          </label>
        }
      >
        Alerts
      </SectionTitle>

      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">No alerts.</p>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <Card key={a.id} className={a.acknowledged_at ? 'opacity-60' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={TONE[a.severity]}>{a.severity}</Badge>
                    <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{a.reason_text}</p>
                  {'distance_m' in a.context && (
                    <p className="mt-1 text-xs text-slate-500">
                      {Math.round(a.context.distance_m as number)} m from{' '}
                      {String(a.context.geofence_name ?? 'the zone')}
                    </p>
                  )}
                </div>
                {!a.acknowledged_at && (
                  <Button variant="ghost" onClick={() => ack(a.id)}>
                    Acknowledge
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
