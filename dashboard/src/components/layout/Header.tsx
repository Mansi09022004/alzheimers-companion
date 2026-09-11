import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { alerts as alertsApi, type Alert } from '../../api';
import { useAuth } from '../../auth';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { BellIcon, ChevronDownIcon, LogoutIcon, MenuIcon } from '../ui/icons';

const SEVERITY_TONE = { info: 'blue', warning: 'amber', critical: 'red' } as const;

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { id } = useParams();
  const nav = useNavigate();
  const [open, setOpen] = useState<'user' | 'alerts' | null>(null);
  const [recent, setRecent] = useState<Alert[] | null>(null);

  useEffect(() => {
    if (!id) return setRecent(null);
    alertsApi.list(Number(id), true).then(setRecent).catch(() => setRecent([]));
  }, [id]);

  const unread = recent?.length ?? 0;

  return (
    <header className="flex h-16 flex-none items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
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
