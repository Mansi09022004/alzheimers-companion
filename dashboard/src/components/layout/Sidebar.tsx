import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';

import { Avatar } from '../ui/Avatar';
import {
  BellIcon,
  ChevronDownIcon,
  HomeIcon,
  MapPinIcon,
  MemoryIcon,
  PillIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
} from '../ui/icons';
import { usePatients } from '../../lib/usePatients';

const NAV = [
  { to: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: 'people', label: 'People', icon: UsersIcon },
  { to: 'memories', label: 'Memories', icon: MemoryIcon },
  { to: 'medication', label: 'Medication', icon: PillIcon },
  { to: 'location', label: 'Location', icon: MapPinIcon },
  { to: 'alerts', label: 'Alerts', icon: BellIcon },
  { to: 'settings', label: 'Settings', icon: SettingsIcon },
];

const linkClass = (active: boolean) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { id } = useParams();
  const { list } = usePatients();
  const nav = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const current = list?.find((p) => String(p.id) === id);

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          AC
        </span>
        <span className="text-sm font-semibold text-slate-900">Alzheimer's Companion</span>
      </div>

      {/* Patient switcher */}
      <div className="relative px-3">
        <button
          onClick={() => setSwitcherOpen((o) => !o)}
          className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
        >
          {current ? (
            <Avatar name={current.full_name} size="sm" />
          ) : (
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <UsersIcon width={14} height={14} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">
              {current?.full_name ?? 'Select a patient'}
            </span>
            <span className="block text-xs text-slate-400">{list ? `${list.length} patient${list.length === 1 ? '' : 's'}` : '…'}</span>
          </span>
          <ChevronDownIcon width={16} height={16} className="flex-none text-slate-400" />
        </button>

        {switcherOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSwitcherOpen(false)} />
            <div className="absolute left-3 right-3 z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-popover">
              {list?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSwitcherOpen(false);
                    onNavigate?.();
                    nav(`/patients/${p.id}/dashboard`);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    String(p.id) === id ? 'bg-brand-50/60 font-medium text-brand-700' : 'text-slate-700'
                  }`}
                >
                  <Avatar name={p.full_name} size="sm" />
                  <span className="truncate">{p.full_name}</span>
                </button>
              ))}
              {list?.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No patients yet.</p>}
              <div className="mt-1 border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    onNavigate?.();
                    nav('/patients');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                >
                  <UsersIcon width={16} height={16} /> All patients
                </button>
                <button
                  onClick={() => {
                    setSwitcherOpen(false);
                    onNavigate?.();
                    nav('/patients?new=1');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-brand-600 hover:bg-slate-50"
                >
                  <PlusIcon width={16} height={16} /> Add patient
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {id ? (
          NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={`/patients/${id}/${to}`} onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>
              <Icon width={18} height={18} />
              {label}
            </NavLink>
          ))
        ) : (
          <p className="px-3 py-2 text-xs text-slate-400">Select a patient above to see their dashboard.</p>
        )}
      </nav>

      <div className="border-t border-slate-100 px-5 py-3 text-[11px] leading-relaxed text-slate-400">
        Prototype — not a medical device.
      </div>
    </div>
  );
}
