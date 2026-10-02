/**
 * "My Routines" — patterns the app has noticed in the patient's own history (medicine
 * times, repeated tasks, the daily routine, visits, places). Purely a read-only view
 * over existing medication/task/routine/location data; nothing new is stored, and a
 * pattern only appears once the backend has seen enough history to support it.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { detectedRoutines, type DetectedRoutine, type RoutineCategory } from '../api/routinePatterns';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

const SECTION_LABEL: Record<RoutineCategory, string> = {
  medication: 'Medicine times',
  task: 'Things you often do',
  routine: 'Your daily routine',
  visit: 'Regular visits',
  journal: 'My Day',
  location: 'Places you often go',
};

const SECTION_ORDER: RoutineCategory[] = ['medication', 'routine', 'visit', 'task', 'journal', 'location'];

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function RoutineLine({ item }: { item: DetectedRoutine }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineIcon}>{item.icon}</Text>
      <Text style={styles.lineText}>{item.message}</Text>
    </View>
  );
}

export function RoutineDetectionScreen() {
  const { token } = useAuth();
  const [routines, setRoutines] = useState<DetectedRoutine[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadError(false);
    try {
      setRoutines(await detectedRoutines(token));
    } catch {
      setLoadError(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = SECTION_ORDER.map((category) => ({
    category,
    items: routines?.filter((r) => r.category === category) ?? [],
  })).filter((s) => s.items.length > 0);

  return (
    <Screen showHelp>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Patterns we've noticed in your days.</Text>

        {routines === null && !loadError && (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
        )}

        {loadError && (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Couldn't load your routines</Text>
            <Text style={styles.messageText}>Please check your connection and try again.</Text>
            <Pressable onPress={load} style={styles.retry} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {routines !== null && !loadError && grouped.length === 0 && (
          <View style={styles.messageCard}>
            <Ionicons name="time-outline" size={30} color={theme.colors.primary} />
            <Text style={styles.messageTitle}>Not enough routine data yet</Text>
            <Text style={styles.messageText}>
              As you use the app each day, patterns will show up here.
            </Text>
          </View>
        )}

        {grouped.map((section) => (
          <View key={section.category} style={styles.section}>
            <SectionLabel>{SECTION_LABEL[section.category]}</SectionLabel>
            {section.items.map((item, i) => (
              <RoutineLine key={`${section.category}-${i}`} item={item} />
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(0.5), paddingBottom: theme.spacing(6) },
  intro: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.textMuted, marginBottom: theme.spacing(1) },
  spinner: { marginTop: theme.spacing(4) },

  messageCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.tealTint,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
  },
  messageTitle: { fontFamily: theme.font.bold, fontSize: 21, color: theme.colors.text, textAlign: 'center' },
  messageText: { fontFamily: theme.font.regular, fontSize: 17, color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 6, minHeight: 48, borderRadius: 999, paddingHorizontal: 24, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: theme.font.bold, fontSize: 17, color: '#FFFFFF' },

  section: { marginBottom: theme.spacing(2) },
  sectionLabel: { fontFamily: theme.font.bold, fontSize: 19, color: theme.colors.text, marginBottom: theme.spacing(1) },

  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.25),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
  },
  lineIcon: { fontSize: 24 },
  lineText: { flex: 1, fontFamily: theme.font.regular, fontSize: 17, lineHeight: 24, color: theme.colors.text },
});
