import type { Alert } from '../../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AlertTriangleIcon } from '../ui/icons';

const TONE = { info: 'blue', warning: 'amber', critical: 'red' } as const;
const ROW_BG = {
  critical: 'border-danger-200 bg-gradient-to-br from-danger-50 to-coral-50',
  warning: 'border-gold-200 bg-gradient-to-br from-gold-100 to-gold-50',
  info: 'border-brand-100 bg-gradient-to-br from-brand-50 to-sage-50',
} as const;

export function AlertCard({ alert, onAcknowledge }: { alert: Alert; onAcknowledge?: (id: number) => void }) {
  const distance = alert.context.distance_m as number | undefined;
  const zone = alert.context.geofence_name as string | undefined;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3.5 ${alert.acknowledged_at ? 'border-ink-100 bg-ink-50 opacity-70' : ROW_BG[alert.severity]}`}>
      <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${alert.severity === 'critical' ? 'bg-danger-100 text-danger-600' : alert.severity === 'warning' ? 'bg-gold-200 text-gold-600' : 'bg-brand-100 text-brand-600'}`}>
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
