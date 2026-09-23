import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { patients } from '../api';
import { useAuth } from '../auth';
import { CareIllustration } from '../components/illustrations/CareIllustration';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { PageSpinner } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { LogoutIcon, MemoryIcon, PillIcon, PlusIcon, ShieldIcon, UsersIcon } from '../components/ui/icons';
import { greeting } from '../lib/greeting';
import { usePatients } from '../lib/usePatients';

const STEPS = [
  { n: '01', icon: UsersIcon, tone: 'brand', title: 'Add your loved one', body: "Start with their name — you can fill in the rest over time." },
  { n: '02', icon: MemoryIcon, tone: 'coral', title: 'Add family & memories', body: 'Register the people they know, and the moments worth remembering.' },
  { n: '03', icon: PillIcon, tone: 'sage', title: 'Set up medicines', body: "Add their schedule so today's doses are tracked automatically." },
  { n: '04', icon: ShieldIcon, tone: 'lavender', title: 'Set up safety', body: "Mark a safe zone at home so you're told if they wander." },
] as const;

const STEP_TONE = {
  brand: 'bg-brand-50 text-brand-600',
  coral: 'bg-coral-50 text-coral-600',
  sage: 'bg-sage-100 text-sage-700',
  lavender: 'bg-lavender-100 text-lavender-700',
} as const;

/**
 * The MVP is one caregiver ↔ one primary loved one — no patient switcher.
 * This page only ever does one of two things: onboard a caregiver with no
 * loved one yet, or bounce straight to that loved one's dashboard.
 */
export function Home() {
  const { user, logout } = useAuth();
  const { list, error } = usePatients();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('new') === '1');
  const [name, setName] = useState('');
  const [homeLabel, setHomeLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const nav = useNavigate();

  const closeModal = () => {
    setOpen(false);
    if (params.get('new')) setParams({}, { replace: true });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await patients.create({ full_name: name, home_label: homeLabel || null });
      toast.success(`${p.full_name} added.`);
      nav(`/patients/${p.id}/dashboard`);
    } catch {
      toast.error('Could not create the patient.');
    } finally {
      setBusy(false);
    }
  };

  if (!list && !error) return <PageSpinner />;

  // A caregiver already has a loved one set up — they're the primary patient
  // (the earliest-added one, deterministic even if this account has legacy data
  // with more than one). Skip straight to their dashboard.
  if (list && list.length > 0) {
    const primary = list.reduce((a, b) => (a.id < b.id ? a : b));
    return <Navigate to={`/patients/${primary.id}/dashboard`} replace />;
  }

  const firstName = user?.full_name.split(' ')[0];

  return (
    <div className="min-h-full bg-cream-100">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="" className="h-8 w-8 object-contain" />
          <span className="text-sm font-semibold text-ink-800">Alzheimer's Companion</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm text-ink-500 hover:bg-white">
          <Avatar name={user?.full_name ?? '?'} size="sm" />
          <span className="hidden sm:inline">{user?.full_name}</span>
          <LogoutIcon width={15} height={15} />
        </button>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-16 pt-4 sm:px-10">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink-900">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">Let's set up care for someone you love.</p>

        {error && <p className="mt-4 text-sm text-danger-600">{error}</p>}

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-white via-white to-brand-50/40 px-8 py-10 sm:px-12">
          <div className="relative z-10 grid items-center gap-8 md:grid-cols-2">
            <div>
              <p className="font-display text-2xl font-semibold leading-snug text-ink-900 sm:text-[28px]">
                Let's set up care for someone you love.
              </p>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-500">
                Adding them lets you register the people they know, the memories worth keeping, their
                medicines, and a safe zone — all in one calm, personal companion.
              </p>
              <Button size="lg" variant="accent" className="mt-6" onClick={() => setOpen(true)}>
                <PlusIcon width={18} height={18} /> Add your loved one
              </Button>
            </div>
            <CareIllustration className="mx-auto h-auto w-full max-w-[280px]" />
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n}>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl ${STEP_TONE[step.tone]}`}>
                  <step.icon width={18} height={18} />
                </span>
                <span className="font-display text-2xl font-semibold text-ink-300">{step.n}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-800">{step.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={closeModal} title="Add your loved one" width="sm">
        <form onSubmit={create} className="space-y-3">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
          <Field label="Home label" hint="e.g. Green Villa — shown around the app and used as the default safe-zone centre later.">
            <Input value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} placeholder="Green Villa" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
