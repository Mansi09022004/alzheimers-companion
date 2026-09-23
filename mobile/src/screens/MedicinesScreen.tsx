/**
 * "Medicines" — built to be scanned in a glance: a one-line summary of the day, the
 * NEXT medicine front and centre with a single big "I took it" button, then the rest
 * of today grouped into "Still to take" and "Done". Real backend data only.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { markDose, medicationsToday, type DoseSlot } from '../api/medications';
import { ACCENTS, TabScreen } from '../components/TabScreen';
import { useAuth } from '../auth/AuthContext';
import { formatLong, formatTime, todayIso } from '../dateUtils';
import type { MedicinesStackParamList } from '../navigation';
import { theme } from '../theme';

type Props = NativeStackScreenProps<MedicinesStackParamList, 'MedicinesHome'>;

const LABEL: Record<DoseSlot['status'], string> = {
  upcoming: 'Upcoming',
  due: 'Take now',
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
};
const TONE: Record<DoseSlot['status'], { fg: string; bg: string }> = {
  upcoming: { fg: theme.colors.primaryDark, bg: theme.colors.primaryTint },
  due: { fg: '#FFFFFF', bg: theme.colors.accent },
  taken: { fg: theme.colors.sage, bg: theme.colors.sageTint },
  skipped: { fg: theme.colors.textMuted, bg: theme.colors.surfaceMuted },
  missed: { fg: theme.colors.danger, bg: theme.colors.dangerTint },
};

const ICON: Record<DoseSlot['status'], keyof typeof Ionicons.glyphMap> = {
  upcoming: 'time-outline',
  due: 'notifications',
  taken: 'checkmark-circle',
  skipped: 'remove-circle-outline',
  missed: 'alert-circle',
};

const keyOf = (s: DoseSlot) => `${s.medication_id}-${s.time}`;
const isPending = (s: DoseSlot) => s.status === 'due' || s.status === 'upcoming' || s.status === 'missed';

/** Time-badge colours follow the dose's state so the whole row reads at a glance. */
function statusTint(status: DoseSlot['status']): string {
  return { upcoming: theme.colors.primaryTint, due: theme.colors.accentTint, taken: theme.colors.sageTint, skipped: theme.colors.surfaceMuted, missed: theme.colors.dangerTint }[status];
}
function statusInk(status: DoseSlot['status']): string {
  return { upcoming: theme.colors.primaryDark, due: theme.colors.accent, taken: theme.colors.sage, skipped: theme.colors.textMuted, missed: theme.colors.danger }[status];
}

function StatusChip({ status }: { status: DoseSlot['status'] }) {
  const tone = TONE[status];
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Ionicons name={ICON[status]} size={16} color={tone.fg} />
      <Text style={[styles.chipText, { color: tone.fg }]}>{LABEL[status]}</Text>
    </View>
  );
}

function DoseRow({ slot, busy, onTake, last }: { slot: DoseSlot; busy: boolean; onTake: (s: DoseSlot) => void; last: boolean }) {
  const actionable = slot.status === 'due' || slot.status === 'missed';
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={[styles.timeBox, { backgroundColor: statusTint(slot.status) }]}>
        <Text style={[styles.timeText, { color: statusInk(slot.status) }]}>{formatTime(slot.time).replace(' ', '\n')}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>{slot.name}</Text>
        {slot.dosage_note ? <Text style={styles.rowDose} numberOfLines={1}>{slot.dosage_note}</Text> : null}
      </View>
      {actionable ? (
        <Pressable
          onPress={() => onTake(slot)}
          disabled={busy}
          style={({ pressed }) => [styles.tookButton, { opacity: pressed || busy ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`I took ${slot.name}`}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.tookText}>I took it</Text>}
        </Pressable>
      ) : (
        <StatusChip status={slot.status} />
      )}
    </View>
  );
}

function SectionLabel({ children, count }: { children: string; count: number }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      <View style={styles.countPill}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

export function MedicinesScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [slots, setSlots] = useState<DoseSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setSlots(await medicationsToday(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const take = async (s: DoseSlot) => {
    if (!token) return;
    setBusyKey(keyOf(s));
    try {
      await markDose(s.medication_id, s.time, 'taken', token);
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const sorted = slots.slice().sort((a, b) => a.time.localeCompare(b.time));
  const pending = sorted.filter(isPending);
  const next = pending[0];
  const stillToTake = pending.slice(1);
  const done = sorted.filter((s) => s.status === 'taken' || s.status === 'skipped');

  const takenCount = sorted.filter((s) => s.status === 'taken').length;
  const toTakeCount = sorted.filter((s) => s.status === 'due' || s.status === 'upcoming').length;
  const missedCount = sorted.filter((s) => s.status === 'missed').length;

  return (
    <TabScreen
      title="Medicines"
      subtitle={formatLong(todayIso())}
      icon="medkit"
      accent={ACCENTS.medicines}
      refreshing={loading}
      onRefresh={load}
    >
      {!loading && slots.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="medkit-outline" size={30} color={theme.colors.mint} />
          <Text style={styles.emptyTitle}>Nothing to take today</Text>
          <Text style={styles.empty}>No medicines are scheduled for today.</Text>
        </View>
      )}

      {slots.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: theme.colors.sage }]}>{takenCount}</Text>
            <Text style={styles.summaryLabel}>Taken</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: theme.colors.accent }]}>{toTakeCount}</Text>
            <Text style={styles.summaryLabel}>To take</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: missedCount ? theme.colors.danger : theme.colors.textMuted }]}>{missedCount}</Text>
            <Text style={styles.summaryLabel}>Missed</Text>
          </View>
        </View>
      )}

      {next && (
        <View style={styles.nextCard}>
          <View style={styles.nextTop}>
            <Text style={styles.nextLabel}>UP NEXT</Text>
            <StatusChip status={next.status} />
          </View>
          <View style={styles.nextMain}>
            <Text style={styles.nextName} numberOfLines={2}>{next.name}</Text>
            {next.dosage_note ? <Text style={styles.nextDose} numberOfLines={2}>{next.dosage_note}</Text> : null}
            <View style={styles.nextTimeRow}>
              <Ionicons name="time" size={20} color={theme.colors.mintDark} />
              <Text style={styles.nextTime}>{formatTime(next.time)}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => take(next)}
            disabled={busyKey === keyOf(next)}
            style={({ pressed }) => [styles.nextButton, { opacity: pressed || busyKey === keyOf(next) ? 0.85 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={`I took ${next.name}`}
          >
            {busyKey === keyOf(next) ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={26} color="#FFFFFF" />
                <Text style={styles.nextButtonText}>I took it</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {stillToTake.length > 0 && (
        <View>
          <SectionLabel count={stillToTake.length}>Still to take</SectionLabel>
          <View style={styles.listCard}>
            {stillToTake.map((s, i) => (
              <DoseRow key={keyOf(s)} slot={s} busy={busyKey === keyOf(s)} onTake={take} last={i === stillToTake.length - 1} />
            ))}
          </View>
        </View>
      )}

      {done.length > 0 && (
        <View>
          <SectionLabel count={done.length}>Done today</SectionLabel>
          <View style={styles.listCard}>
            {done.map((s, i) => (
              <DoseRow key={keyOf(s)} slot={s} busy={false} onTake={take} last={i === done.length - 1} />
            ))}
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.planRow, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => navigation.navigate('Routine')}
        accessibilityRole="button"
        accessibilityLabel="See today's full plan"
      >
        <View style={styles.planIcon}>
          <Ionicons name="list" size={20} color={theme.colors.primaryDark} />
        </View>
        <Text style={styles.planText}>See today's full plan</Text>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.primaryDark} />
      </Pressable>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.mintTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.mint + '40',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(2),
  },
  emptyTitle: { fontFamily: theme.font.bold, fontSize: 20, color: theme.colors.text },
  empty: { fontFamily: theme.font.regular, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing(1.25),
    ...theme.shadow.card,
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 32, backgroundColor: theme.colors.border },
  // Numerals use the system font: Atkinson's slashed zero read as distorted in times and counts.
  summaryNum: { fontWeight: '700', fontSize: 26, lineHeight: 30 },
  summaryLabel: { fontFamily: theme.font.regular, fontSize: 14, color: theme.colors.textMuted },

  nextCard: {
    backgroundColor: theme.colors.mintTint,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.mint + '55',
    padding: theme.spacing(2),
    gap: theme.spacing(1),
    ...theme.shadow.card,
  },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextLabel: { fontFamily: theme.font.bold, fontSize: 14, letterSpacing: 1, color: theme.colors.mintDark },
  nextMain: { gap: 3 },
  nextName: { fontFamily: theme.font.bold, fontSize: 26, lineHeight: 32, color: theme.colors.text },
  nextDose: { fontFamily: theme.font.regular, fontSize: 17, lineHeight: 23, color: theme.colors.textMuted },
  nextTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  nextTime: { fontWeight: '700', fontSize: 24, lineHeight: 30, color: theme.colors.mintDark },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 60,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  nextButtonText: { fontFamily: theme.font.bold, fontSize: 21, color: '#FFFFFF' },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing(0.75), paddingHorizontal: 2 },
  sectionLabel: { fontFamily: theme.font.bold, fontSize: 18, color: theme.colors.text },
  countPill: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: theme.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.textMuted },

  listCard: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing(1.5),
    ...theme.shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.25), paddingVertical: theme.spacing(1), minHeight: 68 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  timeBox: { width: 64, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeText: { fontWeight: '700', fontSize: 15, lineHeight: 18, textAlign: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: theme.font.bold, fontSize: 19, color: theme.colors.text },
  rowDose: { fontFamily: theme.font.regular, fontSize: 14, color: theme.colors.textMuted, marginTop: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 108, height: 34, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { fontFamily: theme.font.bold, fontSize: 14 },
  tookButton: { minWidth: 108, height: 44, borderRadius: 999, paddingHorizontal: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  tookText: { fontFamily: theme.font.bold, fontSize: 15, color: '#FFFFFF' },

  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minHeight: 60,
    backgroundColor: theme.colors.primaryTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.primary + '25',
    paddingHorizontal: theme.spacing(1.75),
  },
  planIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  planText: { flex: 1, fontFamily: theme.font.bold, fontSize: 18, color: theme.colors.primaryDark },
});
