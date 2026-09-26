/**
 * "Did you take your medicine?" — appears over whatever screen the patient is on once a
 * dose is due. "Yes" records the dose as taken (the server stamps the time); "Not yet"
 * changes nothing on the server — the dose stays pending and follows the normal
 * due -> missed logic — and only silences this prompt for a while.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { markDose, medicationsToday, type DoseSlot } from '../api/medications';
import { useAuth } from '../auth/AuthContext';
import { formatTime, todayIso } from '../dateUtils';
import { tokenStore } from '../storage';
import { ConfirmDialog } from './ConfirmDialog';

const POLL_MS = 60_000;
const SNOOZE_MS = 15 * 60_000;
const SNOOZE_KEY = 'dose_snoozed_v1';

/** "date|medicationId|time" -> epoch ms until which we stay quiet about that dose. */
type Snoozed = Record<string, number>;

const keyOf = (s: DoseSlot) => `${todayIso()}|${s.medication_id}|${s.time}`;

async function readSnoozed(): Promise<Snoozed> {
  try {
    const stored = JSON.parse((await tokenStore.get(SNOOZE_KEY)) ?? '{}') as Snoozed;
    const now = Date.now();
    return Object.fromEntries(Object.entries(stored).filter(([, until]) => until > now));
  } catch {
    return {};
  }
}

export function DoseReminder() {
  const { token } = useAuth();
  const [slots, setSlots] = useState<DoseSlot[]>([]);
  const [snoozed, setSnoozed] = useState<Snoozed>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSlots(await medicationsToday(token));
    } catch {
      // Keep what we last knew; the next tick tries again.
    }
  }, [token]);

  useEffect(() => {
    readSnoozed().then(setSnoozed);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  const now = Date.now();
  const current = slots
    .filter((s) => s.status === 'due' && (snoozed[keyOf(s)] ?? 0) <= now)
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const took = async () => {
    if (!token || !current) return;
    setBusy(true);
    setError(null);
    try {
      await markDose(current.medication_id, current.time, 'taken', token);
      await refresh();
    } catch {
      setError("We couldn't save that. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const notYet = () => {
    if (!current) return;
    const next = { ...snoozed, [keyOf(current)]: Date.now() + SNOOZE_MS };
    setSnoozed(next);
    setError(null);
    tokenStore.set(SNOOZE_KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <ConfirmDialog
      visible={!!current}
      title="Did you take your medicine?"
      message={current ? `${current.name}${current.dosage_note ? ` (${current.dosage_note})` : ''} — ${formatTime(current.time)}` : ''}
      confirmLabel="Yes, I took it"
      cancelLabel="Not yet"
      busy={busy}
      error={error}
      onConfirm={took}
      onCancel={notYet}
    />
  );
}
