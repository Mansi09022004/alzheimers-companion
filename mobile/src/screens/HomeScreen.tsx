/**
 * The patient's home screen — a warm companion for the person, not a feature list.
 *
 *   Greeting          -> compact: photo, date, "Good afternoon, Rita"
 *   Something familiar-> a photographic, emotional memory card (tap to hear it again)
 *   Today             -> medicine reminders, next routine item, and the simple task list
 *   My Day            -> one-line journal preview, opens the journal
 *   Ask me            -> the central voice-assistant invitation
 *   Safety            -> a subtle "I'm safe" line above the greeting; "I need help" is a compact pill pinned bottom-right
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { memoryMoment, whyAmIHere, type MemoryMoment, type WhyAmIHere } from '../api/context';
import { listJournal, type JournalEntry } from '../api/journal';
import { medicationsToday, onDosesChanged, type DoseSlot } from '../api/medications';
import { routineToday, type RoutineToday } from '../api/routine';
import { createTask, deleteTask, setTaskCompleted, tasksForDate, type Task } from '../api/tasks';
import { AskMeCard } from '../components/AskMeCard';
import { PersonAvatar } from '../components/PersonAvatar';
import { HelpButton } from '../components/HelpButton';
import { SettingsDialog } from '../components/SettingsDialog';
import { SomethingFamiliarCard } from '../components/SomethingFamiliarCard';
import { TodayCard } from '../components/TodayCard';
import { useAuth } from '../auth/AuthContext';
import { useRole } from '../auth/RoleContext';
import type { HomeStackParamList } from '../navigation';
import { speak } from '../speech';
import { theme } from '../theme';

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ navigation }: Props) {
  const { patient, token, signOut } = useAuth();
  const { clearRole } = useRole();

  const [moment, setMoment] = useState<MemoryMoment | null>(null);
  const [momentLoading, setMomentLoading] = useState(true);
  const [context, setContext] = useState<WhyAmIHere | null>(null);
  const [doses, setDoses] = useState<DoseSlot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[] | null>(null);
  const [routine, setRoutine] = useState<RoutineToday[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const firstName = patient?.full_name?.split(' ')[0] ?? 'there';

  const load = useCallback(
    async (announceMemory = false) => {
      if (!token) return;
      const results = await Promise.allSettled([
        memoryMoment(token),
        whyAmIHere(token),
        medicationsToday(token),
        tasksForDate(todayIso(), token),
        listJournal(token),
        routineToday(token),
      ]);
      if (results[0].status === 'fulfilled') {
        setMoment(results[0].value);
        if (announceMemory && results[0].value.available) speak(results[0].value.message);
      }
      if (results[1].status === 'fulfilled') setContext(results[1].value);
      if (results[2].status === 'fulfilled') setDoses(results[2].value);
      if (results[3].status === 'fulfilled') setTasks(results[3].value);
      if (results[4].status === 'fulfilled') setJournalEntries(results[4].value);
      if (results[5].status === 'fulfilled') setRoutine(results[5].value);
      setMomentLoading(false);
      setTasksLoading(false);
    },
    [token],
  );

  const toggleTask = async (task: Task) => {
    if (!token) return;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    try {
      await setTaskCompleted(task.id, !task.completed, token);
    } catch {
      load();
    }
  };

  const addTask = async (text: string) => {
    if (!token) return;
    const created = await createTask(text, todayIso(), token);
    setTasks((prev) => [...prev, created]);
  };

  const removeTask = async (task: Task) => {
    if (!token) return;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await deleteTask(task.id, token);
    } catch {
      load();
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A dose confirmed from the reminder pop-up (or the Medicines tab) shows here at once.
  useEffect(() => {
    if (!token) return;
    return onDosesChanged(() => {
      medicationsToday(token).then(setDoses).catch(() => {});
    });
  }, [token]);

  // Coming back to Home from another tab (e.g. after writing in My Day, ticking a dose in
  // Medicines) must show fresh data. Refresh only the cheap lists — not the AI-generated
  // memory/location messages, which shouldn't re-run on every visit.
  useEffect(() => {
    return navigation.addListener('focus', async () => {
      if (!token) return;
      const [meds, taskList, journal, plan] = await Promise.allSettled([
        medicationsToday(token),
        tasksForDate(todayIso(), token),
        listJournal(token),
        routineToday(token),
      ]);
      if (meds.status === 'fulfilled') setDoses(meds.value);
      if (taskList.status === 'fulfilled') setTasks(taskList.value);
      if (journal.status === 'fulfilled') setJournalEntries(journal.value);
      if (plan.status === 'fulfilled') setRoutine(plan.value);
    });
  }, [navigation, token]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const todayJournalEntry = journalEntries?.find((e) => e.entry_date === todayIso()) ?? null;
  const nextRoutineItem = routine
    .filter((r) => !r.done)
    .slice()
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))[0];

  const openJournal = () => navigation.getParent()?.navigate('JournalTab' as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={['#E6F0E2', theme.colors.background]} style={styles.wash} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <PersonAvatar name={patient?.full_name ?? firstName} photoUrl={patient?.photo_url} size={62} />
          </View>
          <View style={styles.headerText}>
            <Pressable
              onPress={() => navigation.navigate('WhyAmIHere')}
              style={styles.safeLine}
              accessibilityRole="button"
              accessibilityLabel={context?.place ? `I'm safe. You are at ${context.place}. Tap to hear where you are.` : "I'm safe"}
            >
              <Ionicons name="shield-checkmark" size={15} color={theme.colors.sage} />
              <Text style={styles.safeText} numberOfLines={1}>
                {context?.place ? `I'm safe · ${titleCase(context.place)}` : "I'm safe"}
              </Text>
            </Pressable>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={styles.hello} numberOfLines={2}>
              {greeting()},{' '}
              <Text style={styles.helloName}>{firstName}</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [styles.settingsButton, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <SomethingFamiliarCard moment={moment} loading={momentLoading} firstName={firstName} onPress={() => load(true)} />
        </View>

        <View style={styles.section}>
          <AskMeCard onPress={() => navigation.navigate('Ask')} />
        </View>

        <View style={styles.section}>
          <TodayCard
            doses={doses}
            routineItem={nextRoutineItem}
            tasks={tasks}
            tasksLoading={tasksLoading}
            onOpenMedicines={() => navigation.getParent()?.navigate('MedicinesTab' as never)}
            onToggle={toggleTask}
            onAdd={addTask}
            onDelete={removeTask}
          />
        </View>

        <Pressable style={({ pressed }) => [styles.section, styles.myDay, { opacity: pressed ? 0.85 : 1 }]} onPress={openJournal} accessibilityRole="button" accessibilityLabel="My Day">
          <View style={styles.myDayIcon}>
            <Ionicons name="sunny" size={22} color={theme.colors.pink} />
          </View>
          <View style={styles.myDayText}>
            <Text style={styles.myDayTitle}>My Day</Text>
            <Text style={styles.myDayPreview} numberOfLines={1}>
              {todayJournalEntry ? todayJournalEntry.text : "You haven't written about today yet."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.pink} />
        </Pressable>
      </ScrollView>

      {/* Compact standalone help pill, pinned bottom-right; content has bottom padding to clear it. */}
      <View style={styles.help} pointerEvents="box-none">
        <HelpButton />
      </View>

      <SettingsDialog
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSwitchRole={() => {
          setSettingsOpen(false);
          clearRole();
        }}
        onUnpair={() => {
          setSettingsOpen(false);
          signOut();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  content: { paddingHorizontal: theme.spacing(2), paddingTop: theme.spacing(1.5), paddingBottom: 104 },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.75), paddingHorizontal: 2, paddingVertical: theme.spacing(1), marginBottom: theme.spacing(0.5) },
  avatarRing: { borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 999, ...theme.shadow.soft },
  headerText: { flex: 1, minWidth: 0 },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...theme.shadow.card,
  },
  safeLine: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24, marginBottom: 5 },
  safeText: { flexShrink: 1, fontFamily: theme.font.bold, fontSize: 13, letterSpacing: 0.2, color: theme.colors.sage },
  help: { position: 'absolute', right: theme.spacing(2), bottom: theme.spacing(2) },
  date: { fontFamily: theme.font.regular, fontSize: 16, lineHeight: 22, letterSpacing: 0.3, color: theme.colors.textMuted },
  hello: { fontFamily: theme.font.bold, fontSize: 29, lineHeight: 35, letterSpacing: -0.3, color: theme.colors.text, marginTop: 4 },
  helloName: { color: theme.colors.primaryDark },
  section: { marginTop: theme.spacing(2) },
  myDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.pinkTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.pink + '30',
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.75),
    minHeight: 64,
  },
  myDayIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  myDayText: { flex: 1, minWidth: 0 },
  myDayTitle: { fontFamily: theme.font.bold, fontSize: 19, color: theme.colors.text },
  myDayPreview: { fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.textMuted, marginTop: 2 },
});
