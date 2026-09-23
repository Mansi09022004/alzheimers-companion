import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { alerts as alertsApi, type Alert } from '../../api';
import { useAuth } from '../../auth';
import { playAlertSound } from '../../lib/alertSound';
import { useCurrentPatient } from '../../lib/PatientContext';
import { disablePushAlerts, enablePushAlerts, getPushSubscription, pushSupported } from '../../push';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { BellIcon, ChevronDownIcon, LogoutIcon, MenuIcon } from '../ui/icons';
import { useToast } from '../ui/Toast';

const SEVERITY_TONE = { info: 'blue', warning: 'amber', critical: 'red' } as const;

// How often we check for new alerts while the dashboard is open — this is what
// actually gets a caregiver notified in real time; browser Web Push (below) is
// a best-effort extra for when the tab isn't open at all.
const ALERT_POLL_MS = 10_000;

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { patient } = useCurrentPatient();
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState<'user' | 'alerts' | null>(null);
  const [recent, setRecent] = useState<Alert[] | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const seenAlertIds = useRef<Set<number> | null>(null);

  // Read via refs inside the long-lived polling closure below, so it always uses
  // the latest patient name / toast API instead of whatever was in scope when the
  // interval was set up (patient loads asynchronously, after the poll starts).
  const patientNameRef = useRef<string | undefined>(patient?.full_name);
  patientNameRef.current = patient?.full_name;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!id) return setRecent(null);
    seenAlertIds.current = null; // re-seed (without notifying) whenever the patient changes

    const notifyHelpAlert = (alert: Alert) => {
      const name = patientNameRef.current?.split(' ')[0] ?? 'Your loved one';
      const title = `🆘 ${name} needs help`;
      const body = alert.reason_text;

      toastRef.current.error(`${title} — ${body}`);
      playAlertSound();

      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo-icon.png', tag: `alert-${alert.id}` });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') new Notification(title, { body, icon: '/logo-icon.png', tag: `alert-${alert.id}` });
        });
      }
    };

    const poll = () => {
      alertsApi
        .list(Number(id), true)
        .then((list) => {
          setRecent(list);
          const seen = seenAlertIds.current;
          if (seen === null) {
            // first load for this patient — these already existed, don't re-notify for them
            seenAlertIds.current = new Set(list.map((a) => a.id));
            return;
          }
          const fresh = list.filter((a) => a.type === 'sos' && !seen.has(a.id));
          list.forEach((a) => seen.add(a.id));
          fresh.forEach(notifyHelpAlert);
        })
        .catch(() => {});
    };

    poll();
    const timer = setInterval(poll, ALERT_POLL_MS);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    getPushSubscription().then((sub) => setPushEnabled(!!sub));
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePushAlerts();
        setPushEnabled(false);
        toast.info('Browser alerts turned off.');
      } else {
        await enablePushAlerts();
        setPushEnabled(true);
        toast.success('Browser alerts enabled — SOS will reach you even with this tab closed.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update browser alerts.');
    } finally {
      setPushBusy(false);
    }
  };

  const unread = recent?.length ?? 0;

  return (
    <header className="flex h-12 flex-none items-center justify-between border-b-2 border-brand-100 bg-cream-50 px-4 sm:px-6">
      <button onClick={onMenu} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <MenuIcon />
      </button>
      <span className="hidden lg:block" />

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === 'alerts' ? null : 'alerts')}
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <BellIcon />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white" />
            )}
          </button>
          {open === 'alerts' && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(null)} />
              <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white py-2 shadow-popover">
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-sm font-semibold text-slate-900">Notifications</span>
                  {id && (
                    <Link
                      to={`/patients/${id}/alerts`}
                      onClick={() => setOpen(null)}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      View all
                    </Link>
                  )}
                </div>
                <div className="max-h-80 overflow-auto border-t border-slate-100">
                  {!id && <p className="px-3 py-4 text-sm text-slate-400">Select a patient to see alerts.</p>}
                  {id && recent?.length === 0 && <p className="px-3 py-4 text-sm text-slate-400">No unacknowledged alerts.</p>}
                  {recent?.map((a) => (
                    <div key={a.id} className="flex items-start gap-2 px-3 py-2.5 hover:bg-slate-50">
                      <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">{a.reason_text}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {pushSupported() && (
                  <div className="border-t border-slate-100 px-3 pt-2">
                    <button
                      onClick={togglePush}
                      disabled={pushBusy}
                      className="w-full rounded-lg px-1 py-1.5 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                    >
                      {pushEnabled
                        ? '✓ Browser alerts on — tap to turn off'
                        : 'Enable browser alerts (reaches you even with this tab closed)'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === 'user' ? null : 'user')}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
          >
            <Avatar name={user?.full_name ?? '?'} size="sm" />
            <span className="hidden text-sm font-medium text-slate-700 sm:block">{user?.full_name}</span>
            <ChevronDownIcon width={16} height={16} className="hidden text-slate-400 sm:block" />
          </button>
          {open === 'user' && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(null)} />
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-popover">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email}</p>
                </div>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setOpen(null);
                      logout();
                      nav('/login');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogoutIcon width={16} height={16} /> Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
