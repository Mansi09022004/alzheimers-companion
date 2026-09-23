/**
 * "My Memories" — the patient's own approved memories (real backend data), organised
 * instead of dumped as a feed: switch between "By person" (one card per person, newest
 * first) and "By date" (grouped by month). Long lists collapse to a few entries.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { myMemories, type PatientMemory } from '../api/memories';
import { myPeople, type FamiliarPerson } from '../api/people';
import { PersonAvatar } from '../components/PersonAvatar';
import { ACCENTS, TabScreen } from '../components/TabScreen';
import { useAuth } from '../auth/AuthContext';
import { formatShort, monthLabel } from '../dateUtils';
import { theme } from '../theme';

type Mode = 'person' | 'date';
const COLLAPSED_COUNT = 3;

/** Newest first; undated memories sink to the bottom. */
function byDateDesc(a: PatientMemory, b: PatientMemory): number {
  if (!a.memory_date && !b.memory_date) return b.id - a.id;
  if (!a.memory_date) return 1;
  if (!b.memory_date) return -1;
  return b.memory_date.localeCompare(a.memory_date) || b.id - a.id;
}

function MemoryLine({ memory, personName, last }: { memory: PatientMemory; personName?: string | null; last: boolean }) {
  return (
    <View style={[styles.line, !last && styles.lineDivider]}>
      <View style={styles.lineBar} />
      <View style={styles.lineBody}>
      <Text style={styles.lineText}>{memory.text}</Text>
      <View style={styles.metaRow}>
        {personName ? (
          <View style={styles.personChip}>
            <Ionicons name="heart" size={12} color={theme.colors.lavender} />
            <Text style={styles.personChipText} numberOfLines={1}>{personName}</Text>
          </View>
        ) : null}
        {memory.memory_date ? (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
            <Text style={styles.dateText}>{formatShort(memory.memory_date)}</Text>
          </View>
        ) : null}
      </View>
      </View>
    </View>
  );
}

function ExpandToggle({ expanded, total, onPress }: { expanded: boolean; total: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggle} accessibilityRole="button">
      <Text style={styles.toggleText}>{expanded ? 'Show less' : `Show all ${total}`}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.lavender} />
    </Pressable>
  );
}

export function MemoriesScreen() {
  const { token } = useAuth();
  const [memories, setMemories] = useState<PatientMemory[] | null>(null);
  const [people, setPeople] = useState<FamiliarPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('person');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!token) return;
    const [m, p] = await Promise.all([
      myMemories(token).catch(() => []),
      myPeople(token).catch(() => []),
    ]);
    setMemories(m);
    setPeople(p);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const sorted = useMemo(() => (memories ?? []).slice().sort(byDateDesc), [memories]);

  const personGroups = useMemo(() => {
    const groups = new Map<number | null, PatientMemory[]>();
    for (const m of sorted) {
      const key = m.person_id !== null && personById.has(m.person_id) ? m.person_id : null;
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    // People with the most recent memory first; "everyone else" last.
    return [...groups.entries()].sort(([ka, a], [kb, b]) => {
      if (ka === null) return 1;
      if (kb === null) return -1;
      return byDateDesc(a[0], b[0]);
    });
  }, [sorted, personById]);

  const monthGroups = useMemo(() => {
    const groups = new Map<string, PatientMemory[]>();
    for (const m of sorted) {
      const key = m.memory_date ? monthLabel(m.memory_date) : 'Earlier';
      groups.set(key, [...(groups.get(key) ?? []), m]);
    }
    return [...groups.entries()];
  }, [sorted]);

  const total = memories?.length ?? 0;
  const subtitle = total > 0 ? `${total} ${total === 1 ? 'memory' : 'memories'} from your family` : 'Moments your family has shared';

  return (
    <TabScreen title="My memories" subtitle={subtitle} icon="images" accent={ACCENTS.memories} refreshing={loading} onRefresh={load}>
      {!loading && total === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="images-outline" size={30} color={theme.colors.lavender} />
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.empty}>Your family can add some for you.</Text>
        </View>
      )}

      {total > 0 && (
        <View style={styles.segment} accessibilityRole="tablist">
          {(['person', 'date'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.segmentItem, mode === m && styles.segmentItemActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
            >
              <Ionicons
                name={m === 'person' ? 'people' : 'calendar'}
                size={18}
                color={mode === m ? '#FFFFFF' : theme.colors.textMuted}
              />
              <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>{m === 'person' ? 'By person' : 'By date'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {mode === 'person' &&
        personGroups.map(([personId, items]) => {
          const person = personId !== null ? personById.get(personId) : undefined;
          const key = `p-${personId ?? 'other'}`;
          const open = !!expanded[key];
          const shown = open ? items : items.slice(0, COLLAPSED_COUNT);
          return (
            <View key={key} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                {person ? (
                  <PersonAvatar name={person.display_name} photoUrl={person.photo_url} size={46} />
                ) : (
                  <View style={styles.otherIcon}>
                    <Ionicons name="heart" size={22} color={theme.colors.pink} />
                  </View>
                )}
                <View style={styles.groupHeaderText}>
                  <Text style={styles.groupName} numberOfLines={1}>{person ? person.display_name : 'Other memories'}</Text>
                  <Text style={styles.groupSub} numberOfLines={1}>{person ? person.relationship_label : 'Not about one person'}</Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{items.length} {items.length === 1 ? 'memory' : 'memories'}</Text>
                </View>
              </View>
              {shown.map((m, i) => (
                <MemoryLine key={m.id} memory={m} last={i === shown.length - 1 && items.length <= COLLAPSED_COUNT} />
              ))}
              {items.length > COLLAPSED_COUNT && <ExpandToggle expanded={open} total={items.length} onPress={() => toggle(key)} />}
            </View>
          );
        })}

      {mode === 'date' &&
        monthGroups.map(([label, items]) => {
          const key = `d-${label}`;
          const open = !!expanded[key];
          const shown = open ? items : items.slice(0, COLLAPSED_COUNT);
          return (
            <View key={key} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.otherIcon}>
                  <Ionicons name="calendar" size={22} color={theme.colors.pink} />
                </View>
                <View style={styles.groupHeaderText}>
                  <Text style={styles.groupName} numberOfLines={1}>{label}</Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{items.length} {items.length === 1 ? 'memory' : 'memories'}</Text>
                </View>
              </View>
              {shown.map((m, i) => (
                <MemoryLine
                  key={m.id}
                  memory={m}
                  personName={m.person_id !== null ? personById.get(m.person_id)?.display_name : null}
                  last={i === shown.length - 1 && items.length <= COLLAPSED_COUNT}
                />
              ))}
              {items.length > COLLAPSED_COUNT && <ExpandToggle expanded={open} total={items.length} onPress={() => toggle(key)} />}
            </View>
          );
        })}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.lavenderTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.lavender + '30',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(2),
  },
  emptyTitle: { fontFamily: theme.font.bold, fontSize: 20, color: theme.colors.text },
  empty: { fontFamily: theme.font.regular, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },

  segment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: 999 },
  segmentItemActive: { backgroundColor: theme.colors.lavender, ...theme.shadow.card },
  segmentText: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.textMuted },
  segmentTextActive: { color: '#FFFFFF' },

  groupCard: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.lavender + '25',
    paddingHorizontal: theme.spacing(1.75),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(0.5),
    ...theme.shadow.card,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.25), paddingBottom: theme.spacing(1.25), borderBottomWidth: 1, borderBottomColor: theme.colors.lavender + '25' },
  otherIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.pinkTint, alignItems: 'center', justifyContent: 'center' },
  groupHeaderText: { flex: 1, minWidth: 0 },
  groupName: { fontFamily: theme.font.bold, fontSize: 20, lineHeight: 25, color: theme.colors.text },
  groupSub: { fontFamily: theme.font.regular, fontSize: 15, lineHeight: 20, color: theme.colors.textMuted },
  countPill: { height: 30, borderRadius: 15, paddingHorizontal: 12, backgroundColor: theme.colors.lavenderTint, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.lavender },

  line: { flexDirection: 'row', gap: theme.spacing(1.25), paddingVertical: theme.spacing(1.5) },
  lineDivider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  lineBar: { width: 4, borderRadius: 2, backgroundColor: theme.colors.lavender + '55', alignSelf: 'stretch' },
  lineBody: { flex: 1, minWidth: 0, gap: 6 },
  lineText: { fontFamily: theme.font.regular, fontSize: 18, lineHeight: 26, color: theme.colors.text, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing(1.25) },
  personChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.lavenderTint, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, maxWidth: '100%' },
  personChipText: { fontFamily: theme.font.bold, fontSize: 13, color: theme.colors.lavender },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.textMuted },

  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, borderTopWidth: 1, borderTopColor: theme.colors.border },
  toggleText: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.lavender },
});
