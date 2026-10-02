/**
 * "My Routine" — the patient's day exactly as a caregiver set it up: a plain
 * chronological list, nothing historical and nothing auto-detected. Whichever item
 * is happening now (or coming up next) today is gently highlighted so the patient
 * always has a sense of "what's next," without this reading as a to-do checklist.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { myDefinedRoutines, type DefinedRoutine } from '../api/routine';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

// A light touch only — never invents an activity, just picks a friendlier glyph
// than a generic clock when the title's own words are a clear match.
const ACTIVITY_EMOJI: [RegExp, string][] = [
  [/\bbreakfast\b/i, '🍳'],
  [/\b(lunch|dinner|meal)\b/i, '🍽️'],
  [/\b(walk|walking)\b/i, '🚶'],
  [/\bgarden\b/i, '🌳'],
  [/\b(read|reading|book)\b/i, '📖'],
  [/\bcards?\b/i, '🃏'],
  [/\b(tea|coffee)\b/i, '🍵'],
  [/\b(medicine|medication|tablet|pill)\b/i, '💊'],
  [/\b(bath|shower)\b/i, '🛁'],
  [/\b(sleep|bed|nap)\b/i, '🛏️'],
  [/\b(call|visit)\b/i, '📞'],
  [/\bmusic\b/i, '🎵'],
  [/\b(tv|television)\b/i, '📺'],
];

function emojiFor(title: string): string {
  const hit = ACTIVITY_EMOJI.find(([re]) => re.test(title));
  return hit ? hit[1] : '🕒';
}

const DAY_LABELS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

function cadenceCaption(days: number[]): string | null {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return null; // every day — no caption needed
  if (sorted.join(',') === '0,1,2,3,4') return 'Weekdays';
  if (sorted.join(',') === '5,6') return 'Weekends';
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function friendlyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const HIGHLIGHT_WINDOW_MIN = 90; // stays the "current" item for this long after its time

function highlightedId(items: DefinedRoutine[]): number | null {
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7; // JS Sun=0 -> Mon=0..Sun=6
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todays = items.filter((r) => r.days_of_week.includes(todayDow));

  const current = todays.find((r) => {
    const t = minutesSinceMidnight(r.time_of_day);
    return nowMin >= t && nowMin < t + HIGHLIGHT_WINDOW_MIN;
  });
  if (current) return current.routine_item_id;

  const upcoming = todays
    .filter((r) => minutesSinceMidnight(r.time_of_day) > nowMin)
    .sort((a, b) => a.time_of_day.localeCompare(b.time_of_day))[0];
  return upcoming ? upcoming.routine_item_id : null;
}

export function MyRoutineScreen() {
  const { token } = useAuth();
  const [routines, setRoutines] = useState<DefinedRoutine[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadError(false);
    try {
      setRoutines(await myDefinedRoutines(token));
    } catch {
      setLoadError(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = (routines ?? []).slice().sort((a, b) => a.time_of_day.localeCompare(b.time_of_day));
  const highlightItemId = routines ? highlightedId(sorted) : null;

  return (
    <Screen showHelp>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Things you usually do during the day.</Text>

        {routines === null && !loadError && (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
        )}

        {loadError && (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Couldn't load your routine</Text>
            <Text style={styles.messageText}>Please check your connection and try again.</Text>
            <Pressable onPress={load} style={styles.retry} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {routines !== null && !loadError && sorted.length === 0 && (
          <View style={styles.messageCard}>
            <Text style={styles.messageEmoji}>🌤️</Text>
            <Text style={styles.messageTitle}>No routine added yet</Text>
            <Text style={styles.messageText}>Your family can add your daily routine from the caregiver app.</Text>
          </View>
        )}

        {sorted.map((item) => {
          const isNow = item.routine_item_id === highlightItemId;
          const caption = cadenceCaption(item.days_of_week);
          return (
            <View key={item.routine_item_id} style={[styles.row, isNow && styles.rowHighlighted]}>
              <Text style={[styles.rowTime, isNow && styles.rowTimeHighlighted]}>
                {isNow ? `Around ${friendlyTime(item.time_of_day)}` : friendlyTime(item.time_of_day)}
              </Text>
              <Text style={styles.rowTitle}>
                {emojiFor(item.title)} {item.title}
              </Text>
              {isNow && <Text style={styles.rowCaption}>Something you usually do around this time.</Text>}
              {!isNow && caption && <Text style={styles.rowMeta}>{caption}</Text>}
              {!!item.notes && <Text style={styles.rowNote}>{item.notes}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(1), paddingBottom: theme.spacing(6) },
  intro: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.textMuted, marginBottom: theme.spacing(0.5) },
  spinner: { marginTop: theme.spacing(4) },

  messageCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.tealTint,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
  },
  messageEmoji: { fontSize: 30 },
  messageTitle: { fontFamily: theme.font.bold, fontSize: 21, color: theme.colors.text, textAlign: 'center' },
  messageText: { fontFamily: theme.font.regular, fontSize: 17, color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 6, minHeight: 48, borderRadius: 999, paddingHorizontal: 24, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: theme.font.bold, fontSize: 17, color: '#FFFFFF' },

  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(1.5),
  },
  rowHighlighted: {
    backgroundColor: theme.colors.tealTint,
    borderColor: theme.colors.teal,
  },
  rowTime: { fontFamily: theme.font.bold, fontSize: 14, letterSpacing: 0.3, color: theme.colors.textMuted, textTransform: 'uppercase' },
  rowTimeHighlighted: { color: theme.colors.teal },
  rowTitle: { fontFamily: theme.font.bold, fontSize: 20, lineHeight: 27, color: theme.colors.text, marginTop: 3 },
  rowCaption: { fontFamily: theme.font.regular, fontSize: 15, lineHeight: 21, color: theme.colors.teal, marginTop: 4 },
  rowMeta: { fontFamily: theme.font.regular, fontSize: 14, color: theme.colors.textMuted, marginTop: 3 },
  rowNote: { fontFamily: theme.font.regular, fontSize: 14, lineHeight: 19, color: theme.colors.textMuted, marginTop: 4, fontStyle: 'italic' },
});
