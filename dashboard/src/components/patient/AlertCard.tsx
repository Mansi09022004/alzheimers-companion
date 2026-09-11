import type { Alert } from '../../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AlertTriangleIcon } from '../ui/icons';

const TONE = { info: 'blue', warning: 'amber', critical: 'red' } as const;

export function AlertCard({ alert, onAcknowledge }: { alert: Alert; onAcknowledge?: (id: number) => void }) {
  const distance = alert.context.distance_m as number | undefined;
  const zone = alert.context.geofence_name as string | undefined;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3.5 ${alert.acknowledged_at ? 'border-slate-100 bg-white opacity-60' : 'border-slate-200 bg-white'}`}>
      <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${alert.severity === 'critical' ? 'bg-danger-50 text-danger-600' : alert.severity === 'warning' ? 'bg-warning-50 text-warning-600' : 'bg-brand-50 text-brand-600'}`}>
        <AlertTriangleIcon width={16} height={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge tone={TONE[alert.severity]}>{alert.severity}</Badge>
          <span className="text-xs text-slate-400">{new Date(alert.created_at).toLocaleString()}</span>
        </div>
        <p className="mt-1 text-sm text-slate-800">{alert.reason_text}</p>
        {distance !== undefined && (
          <p className="mt-0.5 text-xs text-slate-500">
            {Math.round(distance)} m from {zone ?? 'the zone'}
          </p>
        )}
      </div>
      {!alert.acknowledged_at && onAcknowledge && (
        <Button size="sm" variant="ghost" onClick={() => onAcknowledge(alert.id)}>
          Acknowledge
        </Button>
      )}
    </div>
  );
}
