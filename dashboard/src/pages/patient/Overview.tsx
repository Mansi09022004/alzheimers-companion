import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  alerts as alertsApi,
  geofences as geofencesApi,
  location as locationApi,
  medications as medsApi,
  memories as memoriesApi,
  patients as patientsApi,
  people as peopleApi,
  routine as routineApi,
  tasks as tasksApi,
  type Alert,
  type DoseSlot,
  type Geofence,
  type LatestLocation,
  type Memory,
  type Person,
  type RoutineTodayItem,
  type Task,
} from '../../api';
import { useAuth } from '../../auth';
import { MemoryCard } from '../../components/patient/MemoryCard';
import { SafetyStatusCard } from '../../components/patient/SafetyStatusCard';
import { Avatar } from '../../components/ui/Avatar';
import { AvatarUpload } from '../../components/ui/AvatarUpload';
import { StatusPill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, SectionTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { SkeletonRows } from '../../components/ui/LoadingState';
import { Timeline, type TimelineItem } from '../../components/ui/Timeline';
import { useToast } from '../../components/ui/Toast';
import {
  AlertTriangleIcon,
  BellIcon,
  CheckIcon,
  TrashIcon,
  ClockIcon,
  HomeIcon,
  MapPinIcon,
  MemoryIcon,
  PillIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from '../../components/ui/icons';
import { greeting } from '../../lib/greeting';
import { useCurrentPatient } from '../../lib/PatientContext';

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function updatedAgo(ageSeconds: number | null): string {
  if (ageSeconds == null) return '';
  if (ageSeconds < 120) return 'Updated just now';
  if (ageSeconds < 3600) return `Last updated ${Math.round(ageSeconds / 60)} minutes ago`;
  if (ageSeconds < 86400) return `Last updated ${Math.round(ageSeconds / 3600)} hours ago`;
  return `Last updated ${Math.round(ageSeconds / 86400)} days ago`;
}

/** "Is the patient home right now?" phrased plainly — this is what a caregiver
 * actually wants to know at a glance, not raw coordinates or a timestamp. */
function homeStatus(
  firstName: string,
  loc: LatestLocation | null,
  hasLocationAlert: boolean,
): { icon: 'home' | 'pin'; tone: 'green' | 'amber' | 'slate'; text: string; sub: string } {
  if (!loc?.point) return { icon: 'pin', tone: 'slate', text: 'Location unavailable', sub: '' };
  if (hasLocationAlert) {
    return { icon: 'pin', tone: 'amber', text: `${firstName} may be away from home`, sub: updatedAgo(loc.age_seconds) };
  }
  return { icon: 'home', tone: 'green', text: `${firstName} is safe at home`, sub: updatedAgo(loc.age_seconds) };
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

const DOSE_STYLE: Record<DoseSlot['status'], { icon: React.ReactNode; tone: TimelineItem['tone'] }> = {
  taken: { icon: <CheckIcon width={14} height={14} />, tone: 'green' },
  due: { icon: <ClockIcon width={14} height={14} />, tone: 'amber' },
  upcoming: { icon: <ClockIcon width={14} height={14} />, tone: 'slate' },
  missed: { icon: <XIcon width={14} height={14} />, tone: 'red' },
  skipped: { icon: <XIcon width={14} height={14} />, tone: 'slate' },
};
const DOSE_LABEL: Record<DoseSlot['status'], string> = {
  taken: 'taken',
  due: 'due now',
  upcoming: 'later today',
  missed: 'missed',
  skipped: 'skipped',
};

// "Needs your attention" is meant to show distinct situations, not a wall of
// near-identical rows — repeated presses/alerts of the same kind are grouped
// into one row with a count, rather than each showing up as its own line.
/** Eased left-edge fade so the hero photo melts into the cream card with no visible seam. */
const HERO_FADE =
  'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.003) 4%, rgba(0,0,0,0.023) 8%, rgba(0,0,0,0.069) 12%, rgba(0,0,0,0.145) 16%, rgba(0,0,0,0.246) 20%, rgba(0,0,0,0.368) 24%, rgba(0,0,0,0.5) 28%, rgba(0,0,0,0.632) 32%, rgba(0,0,0,0.754) 36%, rgba(0,0,0,0.855) 40%, rgba(0,0,0,0.931) 44%, rgba(0,0,0,0.977) 48%, rgba(0,0,0,0.997) 52%, #000 56%)';

const ALERT_TYPE_LABEL: Record<Alert['type'], string> = {
  sos: 'Emergency — help request',
  medication_missed: 'Missed medication',
  geofence_exit: 'Left safe zone',
  geofence_return: 'Returned to safe zone',
};
const ALERT_TYPE_ICON: Record<Alert['type'], typeof AlertTriangleIcon> = {
  sos: ShieldIcon,
  medication_missed: PillIcon,
  geofence_exit: MapPinIcon,
  geofence_return: MapPinIcon,
};

type AlertGroup = { key: string; label: string; icon: typeof AlertTriangleIcon; alerts: Alert[]; latest: Alert };

function groupAlerts(alerts: Alert[]): AlertGroup[] {
  const map = new Map<string, Alert[]>();
  for (const a of alerts) {
    const key = `${a.type}:${a.reason_text}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const sorted = list.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0];
      return { key, label: ALERT_TYPE_LABEL[latest.type] ?? latest.reason_text, icon: ALERT_TYPE_ICON[latest.type] ?? AlertTriangleIcon, alerts: sorted, latest };
    })
    .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
}

export function Overview() {
  const { user } = useAuth();
  const { patient, reload: reloadPatient } = useCurrentPatient();
  const toast = useToast();

  const [openAlerts, setOpenAlerts] = useState<Alert[] | null>(null);
  const [allAlerts, setAllAlerts] = useState<Alert[] | null>(null);
  const [loc, setLoc] = useState<LatestLocation | null>(null);
  const [geofences, setGeofences] = useState<Geofence[] | null>(null);
  const [today, setToday] = useState<DoseSlot[] | null>(null);
  const [routineToday, setRoutineToday] = useState<RoutineTodayItem[] | null>(null);
  const [tasksToday, setTasksToday] = useState<Task[] | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [approvedMemories, setApprovedMemories] = useState<Memory[] | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<Memory[] | null>(null);
  const [people, setPeople] = useState<Person[] | null>(null);

  const load = () => {
    if (!patient) return;
    alertsApi.list(patient.id, true).then(setOpenAlerts).catch(() => setOpenAlerts([]));
    alertsApi.list(patient.id, false).then(setAllAlerts).catch(() => setAllAlerts([]));
    locationApi.latest(patient.id).then(setLoc).catch(() => setLoc({ point: null, age_seconds: null }));
    geofencesApi.list(patient.id).then(setGeofences).catch(() => setGeofences([]));
    medsApi.today(patient.id).then(setToday).catch(() => setToday([]));
    routineApi.today(patient.id).then(setRoutineToday).catch(() => setRoutineToday([]));
    tasksApi.list(patient.id, new Date().toISOString().slice(0, 10)).then(setTasksToday).catch(() => setTasksToday([]));
    memoriesApi.list(patient.id, 'approved').then(setApprovedMemories).catch(() => setApprovedMemories([]));
    memoriesApi
      .list(patient.id, 'pending')
      .then((m) => setPendingSuggestions(m.filter((x) => x.source === 'ai_suggestion')))
      .catch(() => setPendingSuggestions([]));
    peopleApi.list(patient.id).then(setPeople).catch(() => setPeople([]));
  };
  useEffect(load, [patient]);

  if (!patient) return null;

  const firstName = patient.full_name.split(' ')[0];
  const age = ageFromDob(patient.date_of_birth);
  const missedDoses = today?.filter((d) => d.status === 'missed') ?? [];
  const safety =
    openAlerts && openAlerts.some((a) => a.severity === 'critical')
      ? { tone: 'red' as const, label: 'Needs attention' }
      : openAlerts && openAlerts.length > 0
        ? { tone: 'amber' as const, label: `${openAlerts.length} open alert${openAlerts.length > 1 ? 's' : ''}` }
        : { tone: 'green' as const, label: 'All clear' };
  const hasLocationAlert = (openAlerts ?? []).some((a) => a.type === 'geofence_exit');
  const home = homeStatus(firstName, loc, hasLocationAlert);
  const dosesTaken = today?.filter((d) => d.status === 'taken').length ?? 0;
  const memoriesThisWeek = approvedMemories?.filter((m) => Date.now() - new Date(m.created_at).getTime() < 7 * 86400 * 1000).length ?? 0;
  const safeDaysThisWeek = allAlerts
    ? 7 - new Set(
        allAlerts
          .filter((a) => a.type === 'geofence_exit' && Date.now() - new Date(a.created_at).getTime() < 7 * 86400 * 1000)
          .map((a) => new Date(a.created_at).toDateString()),
      ).size
    : null;

  const approve = async (id: number) => {
    await memoriesApi.review(id, 'approved');
    toast.success('Memory approved.');
    load();
  };
  const reject = async (id: number) => {
    await memoriesApi.review(id, 'rejected');
    toast.info('Marked as not correct.');
    load();
  };
  const ackGroup = async (ids: number[]) => {
    await Promise.all(ids.map((id) => alertsApi.acknowledge(id)));
    setOpenAlerts((prev) => prev?.filter((a) => !ids.includes(a.id)) ?? null);
    toast.success(ids.length > 1 ? `${ids.length} alerts acknowledged.` : 'Alert acknowledged.');
  };
  const toggleRoutine = async (item: RoutineTodayItem) => {
    await routineApi.complete(item.routine_item_id, new Date().toISOString().slice(0, 10), !item.done);
    load();
  };
  const toggleTask = async (task: Task) => {
    setTasksToday((prev) => prev?.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)) ?? null);
    try {
      await tasksApi.setCompleted(task.id, !task.completed);
    } catch {
      load();
    }
  };
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !newTaskText.trim()) return;
    setAddingTask(true);
    try {
      const created = await tasksApi.create(patient.id, newTaskText.trim(), new Date().toISOString().slice(0, 10));
      setTasksToday((prev) => [...(prev ?? []), created]);
      setNewTaskText('');
    } catch {
      toast.error('Could not add that task.');
    } finally {
      setAddingTask(false);
    }
  };
  const removeTask = async (task: Task) => {
    setTasksToday((prev) => prev?.filter((t) => t.id !== task.id) ?? null);
    try {
      await tasksApi.remove(task.id);
    } catch {
      toast.error('Could not delete that task.');
      load();
    }
  };

  // --- Today with {name}: doses + memories created today + today's routine, one story ---
  const todayTimeline: (TimelineItem & { at: string })[] = [
    ...(today ?? []).map((d) => ({
      id: `dose-${d.medication_id}-${d.time}`,
      icon: DOSE_STYLE[d.status].icon,
      tone: DOSE_STYLE[d.status].tone,
      title: `${d.name} — ${DOSE_LABEL[d.status]}`,
      subtitle: 'Medicine',
      time: d.time,
      at: d.time,
      href: `/patients/${patient.id}/medication`,
    })),
    ...(routineToday ?? []).map((r) => ({
      id: `routine-${r.routine_item_id}`,
      icon: r.done ? <CheckIcon width={14} height={14} /> : <ClockIcon width={14} height={14} />,
      tone: (r.done ? 'green' : 'slate') as TimelineItem['tone'],
      title: r.title,
      subtitle: r.done ? 'Routine · done' : 'Routine',
      time: r.time_of_day,
      at: r.time_of_day,
    })),
    ...(approvedMemories ?? [])
      .filter((m) => new Date(m.created_at).toDateString() === new Date().toDateString())
      .map((m) => ({
        id: `memory-${m.id}`,
        icon: <SparklesIcon width={14} height={14} />,
        tone: 'lavender' as TimelineItem['tone'],
        title: `New memory: "${m.text.slice(0, 50)}${m.text.length > 50 ? '…' : ''}"`,
        subtitle: 'Memory',
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        at: new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        href: `/patients/${patient.id}/memories`,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  // --- People {name} knows, most recently mentioned in a memory first ---
  const peopleWithRecency = (people ?? []).map((p) => {
    const mentions = (approvedMemories ?? []).filter((m) => m.person_id === p.id);
    return { person: p, lastMemory: mentions[0] ?? null, mentionCount: mentions.length };
  });
  peopleWithRecency.sort((a, b) => {
    if (!a.lastMemory && !b.lastMemory) return 0;
    if (!a.lastMemory) return 1;
    if (!b.lastMemory) return -1;
    return new Date(b.lastMemory.created_at).getTime() - new Date(a.lastMemory.created_at).getTime();
  });

  // --- A moment to remember: most recent memory tied to a person, plus one earlier one about them ---
  const memoriesWithPerson = (approvedMemories ?? []).filter((m) => m.person_id != null);
  const contextMemory = memoriesWithPerson[0] ?? null;
  const contextPerson = contextMemory ? people?.find((p) => p.id === contextMemory.person_id) : undefined;
  const priorMemory = contextMemory
    ? memoriesWithPerson.find((m) => m.person_id === contextMemory.person_id && m.id !== contextMemory.id)
    : null;

  // --- Daily insight — a template sentence built from real facts, never fabricated or diagnostic ---
  const insightParts: string[] = [];
  insightParts.push(
    safety.tone === 'red'
      ? `${firstName} needs attention right now.`
      : safety.tone === 'amber'
        ? `${firstName} has needed a little help today.`
        : `${firstName} has had a calm day so far.`,
  );
  if (today && today.length > 0) {
    insightParts.push(`${dosesTaken} of ${today.length} scheduled ${today.length === 1 ? 'medicine' : 'medicines'} taken.`);
  }
  const todaysPersonMemory = (approvedMemories ?? []).find(
    (m) => m.person_id != null && new Date(m.created_at).toDateString() === new Date().toDateString(),
  );
  if (todaysPersonMemory) {
    const p = people?.find((x) => x.id === todaysPersonMemory.person_id);
    if (p) insightParts.push(`A new memory with ${p.display_name} was logged today.`);
  }

  // --- Recent activity (broader than today: alerts + memories, most recent first) ---
  const recentActivity: TimelineItem[] = [
    ...(allAlerts ?? []).slice(0, 4).map((a) => ({
      id: `t-alert-${a.id}`,
      icon: <AlertTriangleIcon width={14} height={14} />,
      tone: (a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue') as TimelineItem['tone'],
      title: a.reason_text,
      time: timeAgo(a.created_at),
      href: `/patients/${patient.id}/alerts`,
      at: a.created_at,
    })),
    ...(approvedMemories ?? []).slice(0, 4).map((m) => ({
      id: `t-memory-${m.id}`,
      icon: <MemoryIcon width={14} height={14} />,
      tone: 'lavender' as TimelineItem['tone'],
      title: `Memory added: "${m.text.slice(0, 50)}${m.text.length > 50 ? '…' : ''}"`,
      time: timeAgo(m.created_at),
      href: `/patients/${patient.id}/memories`,
      at: m.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5)
    .map(({ at: _at, ...rest }) => rest);

  const urgent = (openAlerts ?? []).filter((a) => a.severity === 'critical');
  const attention = (openAlerts ?? []).filter((a) => a.severity !== 'critical');
  const urgentGroups = groupAlerts(urgent);
  const attentionGroups = groupAlerts(attention);

  const QUICK_ACTIONS = [
    { to: `/patients/${patient.id}/memories?add=1`, icon: MemoryIcon, label: 'Add a memory', tone: 'lavender' as const },
    { to: `/patients/${patient.id}/people?add=1`, icon: UsersIcon, label: 'Add a person', tone: 'coral' as const },
    { to: `/patients/${patient.id}/medication`, icon: PillIcon, label: 'Manage medicines', tone: 'sage' as const },
    { to: `/patients/${patient.id}/location`, icon: MapPinIcon, label: 'Check location', tone: 'brand' as const },
    ...(pendingSuggestions && pendingSuggestions.length > 0
      ? [{ to: `/patients/${patient.id}/memories`, icon: SparklesIcon, label: `Review ${pendingSuggestions.length} suggestion${pendingSuggestions.length > 1 ? 's' : ''}`, tone: 'coral' as const }]
      : []),
  ];
  const TILE_TONE = {
    lavender: 'bg-lavender-100 text-lavender-600',
    coral: 'bg-coral-100 text-coral-600',
    sage: 'bg-sage-200 text-sage-700',
    brand: 'bg-brand-100 text-brand-600',
  };
  const TILE_BG = {
    lavender: 'bg-lavender-50/70 border-lavender-100',
    coral: 'bg-coral-50/70 border-coral-100',
    sage: 'bg-sage-50/70 border-sage-100',
    brand: 'bg-brand-50/70 border-brand-100',
  };

  return (
    <div>
      {/* Hero */}
      <div className="relative mb-4 overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-white via-sage-50 to-brand-100/70 px-7 py-7 sm:px-9 sm:py-9">
        <img
          src="/images/overview-hero-v2.jpg"
          alt=""
          style={{ objectPosition: '50% 40%', maskImage: HERO_FADE, WebkitMaskImage: HERO_FADE }}
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[52%] object-cover sm:block"
        />

        <div className="relative sm:max-w-[56%]">
          <p className="text-xs font-medium text-ink-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 font-['Manrope',sans-serif] text-[28px] font-semibold tracking-tight text-ink-900">
            {greeting()}, {user?.full_name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Here's how <span className="font-medium text-ink-700">{firstName}</span> is doing today.
          </p>
          <p className="mt-3 font-display text-base italic leading-snug text-coral-500">
            "Familiar faces bring brighter days." <span aria-hidden>♡</span>
          </p>
        </div>
      </div>

      <div className="relative mb-6 flex flex-wrap items-center gap-5 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-cream-50 to-sage-50 px-5 py-4 shadow-soft sm:gap-8">
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-peach-100/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-lavender-100/50 blur-2xl" />
        <div className="flex items-center gap-3">
          <AvatarUpload
            name={patient.full_name}
            photoUrl={patient.photo_url}
            size="lg"
            onUpload={async (file) => {
              await patientsApi.uploadPhoto(patient.id, file);
              reloadPatient();
            }}
          />
          <div>
            <p className="font-display text-base font-semibold text-ink-900">
              {patient.full_name}
              {age != null && <span className="ml-1.5 font-sans text-sm font-normal text-ink-400">· {age}</span>}
            </p>
            {openAlerts && openAlerts.length > 0 && (
              <div className="mt-1">
                <StatusPill tone={safety.tone}>{safety.label}</StatusPill>
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                  home.tone === 'green' ? 'bg-sage-100 text-sage-600' : home.tone === 'amber' ? 'bg-warning-50 text-warning-600' : 'bg-ink-100 text-ink-400'
                }`}
              >
                {home.icon === 'home' ? <HomeIcon width={14} height={14} /> : <MapPinIcon width={14} height={14} />}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-800">{home.text}</p>
                {home.sub && <p className="text-xs text-ink-400">{home.sub}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="h-10 w-px bg-ink-100 max-sm:hidden" />
        <div>
          <p className="text-xs font-medium text-ink-400">Medicine today</p>
          <p className="font-display text-xl font-semibold text-ink-900">
            {today ? `${dosesTaken}/${today.length}` : '…'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-400">Memories this week</p>
          <p className="font-display text-xl font-semibold text-ink-900">{approvedMemories ? memoriesThisWeek : '…'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-400">People known</p>
          <p className="font-display text-xl font-semibold text-ink-900">{people ? people.length : '…'}</p>
        </div>
      </div>

      {/* Needs attention — the most urgent thing on the page, right after patient status */}
      <Card className="mb-6" tone={urgent.length > 0 ? 'coral' : attention.length > 0 || missedDoses.length > 0 ? 'gold' : 'sage'}>
        <SectionTitle action={(urgent.length > 0 || attention.length > 0) && <Link to={`/patients/${patient.id}/alerts`} className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>}>
          Needs your attention
        </SectionTitle>
        {!openAlerts && <SkeletonRows count={2} height="h-12" />}
        {openAlerts && urgent.length === 0 && attention.length === 0 && missedDoses.length === 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-sage-100/70 px-4 py-3.5 text-sage-700">
            <CheckIcon width={18} height={18} />
            <p className="text-sm font-medium">All clear — nothing needs your attention.</p>
          </div>
        )}
        <div className="space-y-3">
          {urgentGroups.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-danger-600">Urgent</p>
              <div className="space-y-1.5">
                {urgentGroups.map((g) => (
                  <button key={g.key} onClick={() => ackGroup(g.alerts.map((a) => a.id))} className="flex w-full items-center gap-3 rounded-2xl bg-danger-100/70 px-4 py-3 text-left transition-colors hover:bg-danger-100">
                    <g.icon width={16} height={16} className="flex-none text-danger-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">{g.label}</span>
                      <span className="block truncate text-xs text-ink-500">{g.latest.reason_text}</span>
                    </span>
                    {g.alerts.length > 1 && (
                      <span className="flex-none rounded-full bg-danger-600 px-2 py-0.5 text-[11px] font-bold text-white">×{g.alerts.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(attentionGroups.length > 0 || missedDoses.length > 0) && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gold-600">Needs attention</p>
              <div className="space-y-1.5">
                {attentionGroups.map((g) => (
                  <button key={g.key} onClick={() => ackGroup(g.alerts.map((a) => a.id))} className="flex w-full items-center gap-3 rounded-2xl bg-gold-100/70 px-4 py-3 text-left transition-colors hover:bg-gold-100">
                    <g.icon width={16} height={16} className="flex-none text-gold-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">{g.label}</span>
                      <span className="block truncate text-xs text-ink-500">{g.latest.reason_text}</span>
                    </span>
                    {g.alerts.length > 1 && (
                      <span className="flex-none rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-bold text-white">×{g.alerts.length}</span>
                    )}
                  </button>
                ))}
                {missedDoses.map((d) => (
                  <Link key={`${d.medication_id}-${d.time}`} to={`/patients/${patient.id}/medication`} className="flex items-center gap-3 rounded-2xl bg-gold-100/70 px-4 py-3 transition-colors hover:bg-gold-100">
                    <PillIcon width={16} height={16} className="flex-none text-gold-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">Missed medication</span>
                      <span className="block truncate text-xs text-ink-500">{d.name} — {d.time} dose</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Today's story */}
      <Card className="mb-6" tone="brand">
        <SectionTitle subtitle="Medicines, routine, and memories — in order.">Today with {firstName}</SectionTitle>
        {!today && <SkeletonRows count={3} height="h-10" />}
        {today && todayTimeline.length === 0 && (
          <EmptyState icon={<ClockIcon />} title="Nothing scheduled today" description="Add a medicine or routine item to see today's plan here." />
        )}
        {todayTimeline.length > 0 && <Timeline items={todayTimeline} />}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* People {name} knows */}
          <Card tone="lavender">
            <SectionTitle subtitle={`Family and friends ${firstName} can be reminded about.`} action={<Link to={`/patients/${patient.id}/people`} className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>}>
              People {firstName} knows
            </SectionTitle>
            {!people && <SkeletonRows count={2} height="h-14" />}
            {people?.length === 0 && (
              <EmptyState icon={<UsersIcon />} title="No one registered yet" description="Add family and friends so Companion can recognise and talk about them." />
            )}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {peopleWithRecency.slice(0, 4).map(({ person: p, lastMemory }) => (
                <Link key={p.id} to={`/patients/${patient.id}/people`} className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3 transition-colors hover:bg-white">
                  <Avatar name={p.display_name} photoUrl={p.photo_url} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.display_name}</p>
                    <p className="text-xs text-ink-400">{p.relationship_label}</p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {lastMemory ? `Last mentioned ${timeAgo(lastMemory.created_at)}` : 'No memories yet'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Contextual memory moment */}
          {contextMemory && contextPerson && (
            <Card tone="coral">
              <SectionTitle subtitle="Alzheimer's Companion connects people, relationships, and moments.">
                <span className="inline-flex items-center gap-1.5">A moment to remember ❤️</span>
              </SectionTitle>
              <div className="flex items-start gap-3">
                <Avatar name={contextPerson.display_name} photoUrl={contextPerson.photo_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold text-ink-900">
                    {contextPerson.display_name} <span className="font-sans text-sm font-normal text-ink-400">· {contextPerson.relationship_label}</span>
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">"{contextMemory.text}"</p>
                  <p className="mt-1 text-xs text-ink-400">{timeAgo(contextMemory.created_at)}</p>
                  {priorMemory && (
                    <div className="mt-3 rounded-xl bg-white/70 px-3.5 py-2.5">
                      <p className="text-xs font-semibold text-ink-500">Related memory</p>
                      <p className="mt-0.5 text-sm text-ink-600">"{priorMemory.text}"</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* AI memory suggestion */}
          {pendingSuggestions && pendingSuggestions.length > 0 ? (
            <Card tone="lavender">
              <SectionTitle subtitle="Alzheimer's Companion noticed something worth remembering.">
                <span className="inline-flex items-center gap-1.5">
                  <SparklesIcon width={14} height={14} className="text-lavender-500" /> AI memory suggestion
                </span>
              </SectionTitle>
              <MemoryCard memory={pendingSuggestions[0]} onApprove={approve} onReject={reject} />
              <Link to={`/patients/${patient.id}/memories`} className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline">
                Edit before approving →
              </Link>
            </Card>
          ) : (
            pendingSuggestions && (
              <Card tone="lavender" className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-800">No memory suggestions right now</p>
                  <p className="mt-0.5 text-xs text-ink-500">Paste in a visit note or message and Companion will suggest one.</p>
                </div>
                <Link to={`/patients/${patient.id}/memories`} className="flex-none text-xs font-semibold text-brand-600 hover:underline">
                  Go to Memories →
                </Link>
              </Card>
            )
          )}

          {/* Recent memories journal */}
          <Card tone="coral">
            <SectionTitle subtitle="A personal memory journal, not a database." action={<Link to={`/patients/${patient.id}/memories`} className="text-xs font-semibold text-brand-600 hover:underline">View all</Link>}>
              Recent moments
            </SectionTitle>
            {!approvedMemories && <SkeletonRows count={2} height="h-16" />}
            {approvedMemories?.length === 0 && (
              <EmptyState icon={<MemoryIcon />} title="No memories yet" description="Add a moment that matters. Companion can use it for more personal reminders." />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {approvedMemories?.slice(0, 4).map((m) => {
                const p = people?.find((x) => x.id === m.person_id);
                return (
                  <Link key={m.id} to={`/patients/${patient.id}/memories`} className="rounded-2xl border border-white/60 bg-white/50 p-4 transition-colors hover:bg-white">
                    <p className="text-sm leading-relaxed text-ink-800">"{m.text}"</p>
                    <p className="mt-2 text-xs font-medium text-ink-400">
                      {p ? `${p.display_name} · ` : ''}
                      {m.memory_date ?? timeAgo(m.created_at)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card tone="gold">
            <SectionTitle subtitle="Alerts and memories, most recent first.">Recent activity</SectionTitle>
            {!allAlerts && !approvedMemories && <SkeletonRows count={3} height="h-10" />}
            {recentActivity.length === 0 && allAlerts && approvedMemories && (
              <EmptyState icon={<BellIcon />} title="Nothing here yet" description="Alerts and new memories will show up as they happen." />
            )}
            {recentActivity.length > 0 && <Timeline items={recentActivity} />}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Safety status — location first in this column, matching the page's priority order */}
          <SafetyStatusCard patientId={patient.id} firstName={firstName} loc={loc} geofences={geofences} hasLocationAlert={hasLocationAlert} />

          {/* Daily insight */}
          {(today || approvedMemories) && (
            <Card tone="brand">
              <SectionTitle>
                <span className="inline-flex items-center gap-1.5">
                  <SparklesIcon width={14} height={14} className="text-brand-500" /> Today's insight
                </span>
              </SectionTitle>
              <p className="text-sm leading-relaxed text-ink-700">{insightParts.join(' ')}</p>
            </Card>
          )}

          <Card tone="peach">
            <SectionTitle>Quick actions</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.label} to={a.to} className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 transition-colors hover:brightness-95 ${TILE_BG[a.tone]}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${TILE_TONE[a.tone]}`}>
                    <a.icon width={16} height={16} />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-ink-800">{a.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card tone="sage">
            <SectionTitle>Today's routine</SectionTitle>
            {!routineToday && <SkeletonRows count={2} height="h-10" />}
            {routineToday?.length === 0 && <p className="text-sm text-ink-400">Nothing scheduled today.</p>}
            <div className="space-y-1.5">
              {routineToday
                ?.slice()
                .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))
                .map((r) => (
                  <button key={r.routine_item_id} onClick={() => toggleRoutine(r)} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-sm transition-colors hover:bg-cream-100">
                    <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${r.done ? 'bg-sage-500 text-white' : 'border border-ink-300'}`}>
                      {r.done && <CheckIcon width={11} height={11} />}
                    </span>
                    <span className="font-semibold text-ink-500">{r.time_of_day}</span>
                    <span className={r.done ? 'text-ink-400 line-through' : 'text-ink-700'}>{r.title}</span>
                  </button>
                ))}
            </div>
          </Card>

          <Card tone="sage">
            <SectionTitle>Today's tasks</SectionTitle>
            {!tasksToday && <SkeletonRows count={2} height="h-10" />}
            {tasksToday?.length === 0 && <p className="text-sm text-ink-400">Nothing added yet.</p>}
            <div className="space-y-1.5">
              {tasksToday?.map((t) => (
                <div key={t.id} className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-cream-100">
                  <button onClick={() => toggleTask(t)} className="flex flex-1 items-center gap-2.5 text-left text-sm">
                    <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${t.completed ? 'bg-sage-500 text-white' : 'border border-ink-300'}`}>
                      {t.completed && <CheckIcon width={11} height={11} />}
                    </span>
                    <span className={t.completed ? 'text-ink-400 line-through' : 'text-ink-700'}>{t.text}</span>
                  </button>
                  <button
                    onClick={() => removeTask(t)}
                    aria-label={`Delete task: ${t.text}`}
                    className="flex-none rounded-md p-1 text-ink-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={addTask} className="mt-2.5 flex gap-2">
              <Input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a task…"
                className="text-sm"
              />
              <Button type="submit" size="sm" loading={addingTask} disabled={!newTaskText.trim()}>
                Add
              </Button>
            </form>
          </Card>

          {/* This week */}
          {(approvedMemories || people) && (
            <Card tone="blossom">
              <SectionTitle>This week</SectionTitle>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-display text-lg font-semibold text-ink-900">{memoriesThisWeek}</p>
                  <p className="text-xs text-ink-400">memories</p>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-ink-900">{people?.length ?? '…'}</p>
                  <p className="text-xs text-ink-400">people known</p>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-ink-900">{safeDaysThisWeek ?? '…'}/7</p>
                  <p className="text-xs text-ink-400">safe days</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
