/**
 * "My Day" — the patient's own journal. Real backend storage: one entry per date,
 * written or spoken by the patient. Today is front and centre with one clear action;
 * past days are a compact list grouped by month.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listJournal, type JournalEntry } from '../api/journal';
import { ACCENTS, TabScreen } from '../components/TabScreen';
import { useAuth } from '../auth/AuthContext';
import { formatLong, monthLabel, parseIso, todayIso } from '../dateUtils';
import type { JournalStackParamList } from '../navigation';
import { theme } from '../theme';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalHome'>;

/** True when a preview is likely to be cut off, so we offer a clear way to open the whole entry. */
function isLong(text: string, limit: number): boolean {
  return text.length > limit || text.includes('\n');
}

export function JournalScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setEntries(await listJournal(token).catch(() => []));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const today = todayIso();
  const todayEntry = entries?.find((e) => e.entry_date === today) ?? null;

  const pastGroups = useMemo(() => {
    const past = (entries ?? []).filter((e) => e.entry_date !== today).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    const groups = new Map<string, JournalEntry[]>();
    for (const e of past) {
      const key = monthLabel(e.entry_date);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()];
  }, [entries, today]);

  const openEntry = (entryDate: string, initialText: string) => navigation.navigate('JournalEntry', { entryDate, initialText });

  return (
    <TabScreen
      title="My Day"
      subtitle="Write or speak about your day. It's just for you."
      icon="sunny"
      accent={ACCENTS.day}
      refreshing={loading}
      onRefresh={load}
    >
      <View style={styles.todayCard}>
        <View style={styles.todayTop}>
          <View style={styles.todayBadge}>
            <Ionicons name="today" size={15} color={theme.day.accent} />
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
          <Text style={styles.todayDate}>{formatLong(today)}</Text>
        </View>

        {todayEntry ? (
          <View style={styles.todayTextWrap}>
            <Text style={styles.todayText} numberOfLines={4}>{todayEntry.text}</Text>
            {isLong(todayEntry.text, 150) && (
              <Pressable onPress={() => openEntry(today, todayEntry.text)} style={styles.readMore} accessibilityRole="button" accessibilityLabel="Read full entry">
                <Text style={styles.readMoreText}>Read full entry</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primaryDark} />
              </Pressable>
            )}
          </View>
        ) : (
          <Text style={styles.todayPrompt}>How was your day? Tell me about it.</Text>
        )}

        <Pressable
          onPress={() => openEntry(today, todayEntry?.text ?? '')}
          style={({ pressed }) => [styles.todayButton, { opacity: pressed ? 0.88 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={todayEntry ? "Edit today's entry" : 'Write about today'}
        >
          <Ionicons name={todayEntry ? 'create' : 'mic'} size={22} color="#FFFFFF" />
          <Text style={styles.todayButtonText}>{todayEntry ? 'Edit today' : 'Write about today'}</Text>
        </Pressable>
      </View>

      {!loading && (entries?.length ?? 0) === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="book-outline" size={30} color={theme.day.accent} />
          <Text style={styles.emptyTitle}>Your first page</Text>
          <Text style={styles.empty}>Your days will be kept here, so you can look back on them.</Text>
        </View>
      )}

      {pastGroups.map(([label, items]) => (
        <View key={label}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>{label}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          </View>
          <View style={styles.listCard}>
            {items.map((e, i) => {
              const d = parseIso(e.entry_date);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => openEntry(e.entry_date, e.text)}
                  style={({ pressed }) => [styles.pastRow, i < items.length - 1 && styles.pastDivider, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Entry for ${formatLong(e.entry_date)}`}
                >
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{d ? d.getDate() : ''}</Text>
                    <Text style={styles.dateWeekday}>{d ? d.toLocaleDateString(undefined, { weekday: 'short' }) : ''}</Text>
                  </View>
                  <View style={styles.pastBody}>
                    <Text style={styles.pastText} numberOfLines={2}>{e.text}</Text>
                    {isLong(e.text, 90) && <Text style={styles.readMoreInline}>Read more</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  todayCard: {
    backgroundColor: theme.day.card,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.day.accent + '2E',
    // Journal-style binding edge along the left of today's page.
    borderLeftWidth: 4,
    borderLeftColor: theme.day.accent + '80',
    padding: theme.spacing(2),
    gap: theme.spacing(1.25),
    ...theme.shadow.card,
  },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.day.tint, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  todayBadgeText: { fontFamily: theme.font.bold, fontSize: 15, color: theme.colors.text },
  todayDate: { flexShrink: 1, fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.textMuted },
  todayTextWrap: { gap: theme.spacing(0.5) },
  todayText: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.text },
  readMore: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
  readMoreText: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.primaryDark },
  readMoreInline: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.primaryDark, marginTop: 3 },
  todayPrompt: { fontFamily: theme.font.bold, fontSize: 21, lineHeight: 28, color: theme.colors.text },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  todayButtonText: { fontFamily: theme.font.bold, fontSize: 19, color: '#FFFFFF' },

  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.day.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.day.accent + '26',
    paddingVertical: theme.spacing(2.5),
    paddingHorizontal: theme.spacing(2),
  },
  emptyTitle: { fontFamily: theme.font.bold, fontSize: 20, color: theme.colors.text },
  empty: { fontFamily: theme.font.regular, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing(0.75), paddingHorizontal: 2 },
  sectionLabel: { fontFamily: theme.font.bold, fontSize: 18, color: theme.colors.text },
  countPill: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: theme.day.tint, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.text },

  listCard: {
    backgroundColor: theme.day.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.day.accent + '26',
    paddingHorizontal: theme.spacing(1.5),
    ...theme.shadow.card,
  },
  pastRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), paddingVertical: theme.spacing(1.25), minHeight: 72 },
  pastDivider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  dateBox: { width: 54, height: 58, borderRadius: 14, backgroundColor: theme.day.tint, borderWidth: 1, borderColor: theme.day.accent + '30', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // System font for the day number: Atkinson's slashed zero looks off in dates.
  dateDay: { fontWeight: '700', fontSize: 22, lineHeight: 26, color: theme.colors.text },
  dateWeekday: { fontFamily: theme.font.bold, fontSize: 12, letterSpacing: 0.4, color: theme.colors.textMuted, textTransform: 'uppercase' },
  pastBody: { flex: 1, minWidth: 0 },
  pastText: { fontFamily: theme.font.regular, fontSize: 17, lineHeight: 23, color: theme.colors.text },
});
