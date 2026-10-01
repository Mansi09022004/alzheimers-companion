/**
 * "What's happening today?" — one calm, chronological list of the day: medicine times,
 * the day's routine (incl. family visits a caregiver scheduled as a routine item, e.g.
 * "Rahul visits"), and the My Day note, ordered by time. Tasks have no scheduled time,
 * so they sit in their own "Anytime today" section rather than be given a fake slot.
 * All data is the same backend data other screens already use — nothing new is stored.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completeRoutine, routineToday, type RoutineToday } from '../api/routine';
import { listJournal, type JournalEntry } from '../api/journal';
import { markDose, medicationsToday, onDosesChanged, type DoseSlot } from '../api/medications';
import { setTaskCompleted, tasksForDate, type Task } from '../api/tasks';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { formatTime, todayIso } from '../dateUtils';
import { theme } from '../theme';

const DOSE_LABEL: Record<DoseSlot['status'], string> = {
  upcoming: 'Upcoming',
  due: 'Take now',
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
};
const DOSE_TONE: Record<DoseSlot['status'], { fg: string; bg: string }> = {
  upcoming: { fg: theme.colors.mintDark, bg: theme.colors.mintTint },
  due: { fg: '#FFFFFF', bg: theme.colors.accent },
  taken: { fg: theme.colors.sage, bg: theme.colors.sageTint },
  skipped: { fg: theme.colors.textMuted, bg: theme.colors.surfaceMuted },
  missed: { fg: theme.colors.danger, bg: theme.colors.dangerTint },
};

function timeFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
}

/** A row's sort key — "HH:MM" strings sort correctly as plain text. */
type TimelineRow =
  | { kind: 'medicine'; sortKey: string; dose: DoseSlot }
  | { kind: 'routine'; sortKey: string; item: RoutineToday }
  | { kind: 'journal'; sortKey: string; entry: JournalEntry };

export function TodayScreen() {
  const { token } = useAuth();
  const [doses, setDoses] = useState<DoseSlot[]>([]);
  const [routine, setRoutine] = useState<RoutineToday[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [d, r, t, j] = await Promise.allSettled([
      medicationsToday(token),
      routineToday(token),
      tasksForDate(todayIso(), token),
      listJournal(token),
    ]);
    if (d.status === 'fulfilled') setDoses(d.value);
    if (r.status === 'fulfilled') setRoutine(r.value);
    if (t.status === 'fulfilled') setTasks(t.value);
    if (j.status === 'fulfilled') setJournalEntry(j.value.find((e) => e.entry_date === todayIso()) ?? null);
  }, [token]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => onDosesChanged(load), [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const takeDose = async (d: DoseSlot) => {
    if (!token) return;
    const key = `dose-${d.medication_id}-${d.time}`;
    setBusyKey(key);
    try {
      await markDose(d.medication_id, d.time, 'taken', token); // subscribers (incl. this screen) reload
    } finally {
      setBusyKey(null);
    }
  };

  const toggleRoutine = async (it: RoutineToday) => {
    if (!token) return;
    const key = `routine-${it.routine_item_id}`;
    setRoutine((prev) => prev.map((x) => (x.routine_item_id === it.routine_item_id ? { ...x, done: !x.done } : x)));
    setBusyKey(key);
    try {
      await completeRoutine(it.routine_item_id, !it.done, token);
    } catch {
      load();
    } finally {
      setBusyKey(null);
    }
  };

  const toggleTask = async (t: Task) => {
    if (!token) return;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
    try {
      await setTaskCompleted(t.id, !t.completed, token);
    } catch {
      load();
    }
  };

  const timeline: TimelineRow[] = [
    ...doses.map((dose): TimelineRow => ({ kind: 'medicine', sortKey: dose.time, dose })),
    ...routine.map((item): TimelineRow => ({ kind: 'routine', sortKey: item.time_of_day, item })),
    ...(journalEntry
      ? ([{ kind: 'journal', sortKey: journalEntry.created_at.slice(11, 16), entry: journalEntry }] as TimelineRow[])
      : []),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const isEmpty = !loading && timeline.length === 0 && tasks.length === 0;

  return (
    <Screen showHelp>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.intro}>Everything happening today, in order.</Text>

        {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />}

        {isEmpty && (
          <View style={styles.emptyCard}>
            <Ionicons name="sunny-outline" size={30} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>Nothing planned for today</Text>
            <Text style={styles.emptyText}>Nothing is scheduled right now. Check back later.</Text>
          </View>
        )}

        {timeline.map((row) => {
          if (row.kind === 'medicine') {
            const { dose } = row;
            const tone = DOSE_TONE[dose.status];
            const actionable = dose.status === 'due' || dose.status === 'missed';
            const key = `dose-${dose.medication_id}-${dose.time}`;
            return (
              <View key={key} style={styles.row}>
                <View style={[styles.timeBox, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.timeText, { color: tone.fg }]}>{formatTime(dose.time).replace(' ', '\n')}</Text>
                </View>
                <View style={styles.rowIcon}>
                  <Ionicons name="medkit" size={20} color={theme.colors.mintDark} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>Take {dose.name}</Text>
                  {dose.dosage_note ? <Text style={styles.rowSub} numberOfLines={1}>{dose.dosage_note}</Text> : null}
                </View>
                {actionable ? (
                  <Pressable
                    onPress={() => takeDose(dose)}
                    disabled={busyKey === key}
                    style={({ pressed }) => [styles.actionButton, { opacity: pressed || busyKey === key ? 0.8 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`I took ${dose.name}`}
                  >
                    {busyKey === key ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.actionText}>I took it</Text>}
                  </Pressable>
                ) : (
                  <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.chipText, { color: tone.fg }]}>{DOSE_LABEL[dose.status]}</Text>
                  </View>
                )}
              </View>
            );
          }
          if (row.kind === 'routine') {
            const { item } = row;
            const key = `routine-${item.routine_item_id}`;
            return (
              <Pressable key={key} onPress={() => toggleRoutine(item)} style={styles.row} disabled={busyKey === key}>
                <View style={[styles.timeBox, { backgroundColor: theme.colors.pinkTint }]}>
                  <Text style={[styles.timeText, { color: theme.colors.pink }]}>{formatTime(item.time_of_day).replace(' ', '\n')}</Text>
                </View>
                <View style={[styles.rowIcon, { backgroundColor: theme.colors.pinkTint }]}>
                  <Ionicons name="sparkles" size={20} color={theme.colors.pink} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, item.done && styles.rowTitleDone]} numberOfLines={2}>{item.title}</Text>
                </View>
                <View style={[styles.check, item.done && styles.checkOn]}>
                  {item.done && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          }
          const { entry } = row;
          return (
            <View key="journal" style={styles.row}>
              <View style={[styles.timeBox, { backgroundColor: theme.colors.lavenderTint }]}>
                <Text style={[styles.timeText, { color: theme.colors.lavender }]}>{timeFromIso(entry.created_at).replace(' ', '\n')}</Text>
              </View>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.lavenderTint }]}>
                <Ionicons name="sunny" size={20} color={theme.colors.lavender} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Wrote in My Day</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{entry.text}</Text>
              </View>
            </View>
          );
        })}

        {tasks.length > 0 && (
          <View style={styles.anytimeSection}>
            <Text style={styles.anytimeLabel}>Anytime today</Text>
            {tasks.map((t) => (
              <Pressable key={t.id} onPress={() => toggleTask(t)} style={styles.taskRow} accessibilityRole="checkbox" accessibilityState={{ checked: t.completed }}>
                <View style={[styles.check, t.completed && styles.checkOn]}>
                  {t.completed && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                </View>
                <Text style={[styles.taskText, t.completed && styles.rowTitleDone]}>{t.text}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(1.25), paddingBottom: theme.spacing(12) },
  intro: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.textMuted, marginBottom: theme.spacing(0.5) },
  spinner: { marginTop: theme.spacing(4) },

  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
  },
  emptyTitle: { fontFamily: theme.font.bold, fontSize: 21, color: theme.colors.text, textAlign: 'center' },
  emptyText: { fontFamily: theme.font.regular, fontSize: 17, color: theme.colors.textMuted, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1),
    minHeight: 72,
    ...theme.shadow.card,
  },
  timeBox: { width: 62, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeText: { fontFamily: theme.font.bold, fontSize: 14, lineHeight: 17, textAlign: 'center' },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.mintTint, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.font.bold, fontSize: 19, color: theme.colors.text },
  rowTitleDone: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  rowSub: { fontFamily: theme.font.regular, fontSize: 14, color: theme.colors.textMuted, marginTop: 1 },

  chip: { minWidth: 96, height: 34, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: theme.font.bold, fontSize: 14 },
  actionButton: { minWidth: 108, height: 44, borderRadius: 999, paddingHorizontal: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: theme.font.bold, fontSize: 15, color: '#FFFFFF' },

  check: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkOn: { backgroundColor: theme.colors.primary },

  anytimeSection: {
    marginTop: theme.spacing(1),
    backgroundColor: theme.colors.tealTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.teal + '30',
    padding: theme.spacing(1.5),
    gap: theme.spacing(0.5),
  },
  anytimeLabel: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.teal, marginBottom: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), minHeight: 52 },
  taskText: { flex: 1, fontFamily: theme.font.regular, fontSize: theme.fontSize.body, color: theme.colors.text, lineHeight: 26 },
});
