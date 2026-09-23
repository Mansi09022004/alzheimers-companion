import { NavLink } from 'react-router-dom';

import { useCurrentPatient } from '../../lib/PatientContext';
import { Avatar } from '../ui/Avatar';
import { BellIcon, HomeIcon, MapPinIcon, MemoryIcon, PillIcon, SettingsIcon, UsersIcon } from '../ui/icons';

const NAV = [
  { to: 'dashboard', label: 'Overview', icon: HomeIcon },
  { to: 'people', label: 'People', icon: UsersIcon },
  { to: 'memories', label: 'Memories', icon: MemoryIcon },
  { to: 'medication', label: 'Medication', icon: PillIcon },
  { to: 'location', label: 'Location', icon: MapPinIcon },
  { to: 'alerts', label: 'Alerts', icon: BellIcon },
  { to: 'settings', label: 'Settings', icon: SettingsIcon },
];

const linkClass = (active: boolean) =>
  `flex items-center gap-2.5 rounded-lg border-l-[3px] px-2.5 py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-brand-500 bg-brand-50 text-brand-700'
      : 'border-transparent text-slate-600 hover:bg-cream-100 hover:text-slate-900'
  }`;

/** Only ever rendered inside a PatientProvider — this app is scoped to one loved one at a time. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { patient } = useCurrentPatient();
  if (!patient) return null;

  return (
    <div className="flex h-full w-64 flex-col border-r border-cream-300 bg-cream-50">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
        <span className="text-sm font-semibold text-slate-900">Alzheimer's Companion</span>
      </div>

      {/* Who this app is for right now — not a switcher, just identity. */}
      <div className="mx-3 flex items-center gap-2.5 rounded-lg bg-cream-100 px-3 py-2.5">
        <Avatar name={patient.full_name} photoUrl={patient.photo_url} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{patient.full_name}</p>
          <p className="text-xs text-ink-400">Your loved one</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={`/patients/${patient.id}/${to}`} onClick={onNavigate} className={({ isActive }) => linkClass(isActive)}>
            <Icon width={18} height={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="relative mx-3 mb-4 overflow-hidden rounded-xl border border-sage-200/70 bg-gradient-to-br from-sage-100 via-cream-100 to-brand-50 px-3.5 py-4 shadow-soft">
        {/* Abstract botanical mark — brand leaves, not a photo, so this card reads as a
            piece of identity rather than a second banner repeating the hero image. */}
        <svg
          viewBox="0 0 120 88"
          className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-32 opacity-80"
          aria-hidden="true"
        >
          <path d="M60 78 C60 40 90 20 118 10 C112 42 92 66 60 78 Z" className="fill-sage-300/60" />
          <path d="M60 78 C60 46 36 28 8 22 C16 50 34 70 60 78 Z" className="fill-brand-300/50" />
          <path d="M60 78 C58 54 66 38 84 28 C82 50 74 66 60 78 Z" className="fill-peach-200/60" />
          <path d="M60 12 C60 40 60 60 60 78" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sage-400/70" />
        </svg>
        <div className="relative flex items-center gap-1.5">
          <img src="/logo-icon.png" alt="" className="h-4 w-4 object-contain" />
          <p className="text-[11px] font-semibold tracking-wide text-brand-700">Alzheimer's Companion</p>
        </div>
        <p className="relative mt-2 max-w-[70%] font-display text-[15px] italic leading-snug text-ink-800">
          Holding on to what matters.
        </p>
      </div>
    </div>
  );
}
