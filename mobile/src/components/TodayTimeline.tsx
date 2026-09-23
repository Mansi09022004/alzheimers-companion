/**
 * "Today at a glance" — merges real medicine doses and routine items into one
 * chronological timeline, the way a person actually experiences their day.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DoseSlot } from '../api/medications';
import type { RoutineToday } from '../api/routine';
import { theme } from '../theme';

type Entry = {
  key: string;
  time: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'done' | 'due' | 'upcoming' | 'missed';
};

const TONE_COLOR: Record<Entry['tone'], string> = {
  done: theme.colors.sage,
  due: theme.colors.primary,
  upcoming: theme.colors.textMuted,
  missed: theme.colors.danger,
};

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr ?? '00'} ${period}`;
}

const DOSE_SUBTITLE: Record<DoseSlot['status'], string> = {
  taken: 'Taken',
  due: 'Time to take',
  upcoming: 'Upcoming',
  skipped: 'Skipped',
  missed: 'Missed',
};
const DOSE_TONE: Record<DoseSlot['status'], Entry['tone']> = {
  taken: 'done',
  due: 'due',
  upcoming: 'upcoming',
  skipped: 'upcoming',
  missed: 'missed',
};

export function TodayTimeline({
  doses,
  routines,
  onPressMedicine,
  onPressRoutine,
}: {
  doses: DoseSlot[];
  routines: RoutineToday[];
  onPressMedicine: () => void;
  onPressRoutine: () => void;
}) {
  const entries = useMemo<Entry[]>(() => {
    const meds: Entry[] = doses.map((d) => ({
      key: `m-${d.medication_id}-${d.time}`,
      time: d.time,
      title: d.name,
      subtitle: DOSE_SUBTITLE[d.status],
      icon: 'medkit',
      tone: DOSE_TONE[d.status],
    }));
    const routine: Entry[] = routines.map((r) => ({
      key: `r-${r.routine_item_id}`,
      time: r.time_of_day,
      title: r.title,
      subtitle: r.done ? 'Done' : 'Upcoming',
      icon: 'sunny',
      tone: r.done ? 'done' : 'upcoming',
    }));
    return [...meds, ...routine].sort((a, b) => a.time.localeCompare(b.time));
  }, [doses, routines]);

  if (entries.length === 0) {
    return <Text style={styles.empty}>Nothing planned for today yet.</Text>;
  }

  return (
    <View>
      {entries.map((e, i) => (
        <Pressable
          key={e.key}
          onPress={e.icon === 'medkit' ? onPressMedicine : onPressRoutine}
          style={styles.row}
        >
          {i < entries.length - 1 && <View style={styles.line} />}
          <View style={[styles.dot, { backgroundColor: TONE_COLOR[e.tone] + '22' }]}>
            <Ionicons name={e.icon} size={16} color={TONE_COLOR[e.tone]} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.time}>{formatTime(e.time)}</Text>
            <Text style={styles.title}>{e.title}</Text>
          </View>
          <Text style={[styles.status, { color: TONE_COLOR[e.tone] }]}>{e.subtitle}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: theme.font.regular, fontSize: theme.fontSize.body, color: theme.colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing(1.25) },
  line: { position: 'absolute', left: 17, top: 38, bottom: -10, width: 1.5, backgroundColor: theme.colors.border },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing(1.5) },
  textCol: { flex: 1 },
  time: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors.textMuted },
  title: { fontFamily: theme.font.bold, fontSize: 17, color: theme.colors.text, marginTop: 1 },
  status: { fontFamily: theme.font.bold, fontSize: 14 },
});
