/**
 * "Today" — two compact cards: Medicines (plus the next routine item) and My tasks.
 * Rows are one clean line each with large text and easy-to-hit targets; the task list's
 * add / tick / delete all work exactly as before.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DoseSlot } from '../api/medications';
import type { RoutineToday } from '../api/routine';
import type { Task } from '../api/tasks';
import { theme } from '../theme';

const DOSE_LABEL: Record<DoseSlot['status'], string> = {
  upcoming: 'Later',
  due: 'Take now',
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
};
const DOSE_TONE: Record<DoseSlot['status'], { fg: string; bg: string }> = {
  upcoming: { fg: theme.colors.textMuted, bg: theme.colors.surfaceMuted },
  due: { fg: '#FFFFFF', bg: theme.colors.accent },
  taken: { fg: theme.colors.sage, bg: theme.colors.sageTint },
  skipped: { fg: theme.colors.textMuted, bg: theme.colors.surfaceMuted },
  missed: { fg: theme.colors.danger, bg: theme.colors.dangerTint },
};

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr ?? '00'} ${period}`;
}

function CardHeader({ icon, color, label, note }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; note?: string }) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.headerIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.headerLabel, { color }]}>{label}</Text>
      {note ? <Text style={styles.headerNote}>{note}</Text> : null}
    </View>
  );
}

export function TodayCard({
  doses,
  routineItem,
  tasks,
  tasksLoading,
  onOpenMedicines,
  onToggle,
  onAdd,
  onDelete,
}: {
  doses: DoseSlot[];
  routineItem: RoutineToday | undefined;
  tasks: Task[];
  tasksLoading: boolean;
  onOpenMedicines: () => void;
  onToggle: (task: Task) => void;
  onAdd: (text: string) => Promise<void>;
  onDelete: (task: Task) => void;
}) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setAdding(true);
    try {
      await onAdd(text);
      setDraft('');
    } finally {
      setAdding(false);
    }
  };

  const sortedDoses = doses.slice().sort((a, b) => a.time.localeCompare(b.time));
  const dosesLeft = sortedDoses.filter((d) => d.status === 'due' || d.status === 'upcoming' || d.status === 'missed').length;
  const tasksLeft = tasks.filter((t) => !t.completed).length;
  const showMeds = sortedDoses.length > 0 || !!routineItem;

  return (
    <View>
      <Text style={styles.heading}>Today</Text>

      {showMeds && (
        <View style={[styles.card, styles.medsCard]}>
          <CardHeader
            icon="medkit"
            color={theme.colors.mintDark}
            label="Medicines"
            note={sortedDoses.length ? (dosesLeft ? `${dosesLeft} to take` : 'All done') : undefined}
          />
          {sortedDoses.map((d, i) => {
            const tone = DOSE_TONE[d.status];
            return (
              <Pressable
                key={`${d.medication_id}-${d.time}`}
                onPress={onOpenMedicines}
                style={[styles.row, i > 0 && styles.rowDivider]}
                accessibilityRole="button"
                accessibilityLabel={`${d.name} at ${formatTime(d.time)}, ${DOSE_LABEL[d.status]}`}
              >
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{formatTime(d.time).replace(' ', '\n')}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{d.name}</Text>
                  {d.dosage_note ? <Text style={styles.rowSub} numberOfLines={1}>{d.dosage_note}</Text> : null}
                </View>
                <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                  {d.status === 'taken' && <Ionicons name="checkmark" size={15} color={tone.fg} />}
                  <Text style={[styles.chipText, { color: tone.fg }]}>{DOSE_LABEL[d.status]}</Text>
                </View>
              </Pressable>
            );
          })}
          {routineItem && (
            <View style={[styles.row, sortedDoses.length > 0 && styles.rowDivider]}>
              <View style={[styles.timeBox, { backgroundColor: theme.colors.pinkTint }]}>
                <Text style={[styles.timeText, { color: theme.colors.pink }]}>{formatTime(routineItem.time_of_day).replace(' ', '\n')}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>{routineItem.title}</Text>
                <Text style={styles.rowSub}>Coming up today</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: theme.colors.pinkTint }]}>
                <Ionicons name="notifications" size={15} color={theme.colors.pink} />
                <Text style={[styles.chipText, { color: theme.colors.pink }]}>Reminder</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={[styles.card, styles.tasksCard, showMeds && styles.cardGap]}>
        <CardHeader
          icon="checkbox"
          color={theme.colors.teal}
          label="My tasks"
          note={tasks.length ? (tasksLeft ? `${tasksLeft} to do` : 'All done') : undefined}
        />

        {tasksLoading && <Text style={styles.muted}>Loading…</Text>}
        {!tasksLoading && tasks.length === 0 && <Text style={styles.muted}>Nothing added yet.</Text>}

        {tasks.map((t, i) => (
          <View key={t.id} style={[styles.taskRow, i > 0 && styles.rowDivider]}>
            <Pressable
              onPress={() => onToggle(t)}
              style={styles.taskMain}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: t.completed }}
            >
              <View style={[styles.checkbox, t.completed && styles.checkboxDone]}>
                {t.completed && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
              </View>
              <Text style={[styles.taskText, t.completed && styles.taskTextDone]}>{t.text}</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(t)}
              style={styles.deleteButton}
              accessibilityRole="button"
              accessibilityLabel={`Delete task: ${t.text}`}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.textMuted} />
            </Pressable>
          </View>
        ))}

        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a task…"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            onSubmitEditing={submit}
            returnKeyType="done"
            accessibilityLabel="New task"
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim() || adding}
            style={[styles.addButton, (!draft.trim() || adding) && styles.addButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Add task"
          >
            {adding ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="add" size={28} color="#FFFFFF" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: theme.font.bold, fontSize: 26, color: theme.colors.text, marginBottom: theme.spacing(1) },
  card: {
    borderRadius: theme.radius,
    borderWidth: 1,
    paddingHorizontal: theme.spacing(1.75),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.25),
    ...theme.shadow.card,
  },
  cardGap: { marginTop: theme.spacing(1.25) },
  medsCard: { backgroundColor: theme.colors.mintTint, borderColor: theme.colors.mint + '40' },
  tasksCard: { backgroundColor: theme.colors.tealTint, borderColor: theme.colors.teal + '30' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing(0.5) },
  headerIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontFamily: theme.font.bold, fontSize: 17, letterSpacing: 0.2 },
  headerNote: { marginLeft: 'auto', fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.25), paddingVertical: theme.spacing(1), minHeight: 64 },
  rowDivider: { borderTopWidth: 1, borderTopColor: 'rgba(43,38,32,0.08)' },
  timeBox: { width: 60, height: 46, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeText: { fontFamily: theme.font.bold, fontSize: 14, lineHeight: 17, textAlign: 'center', color: theme.colors.mintDark },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: theme.font.bold, fontSize: 19, color: theme.colors.text },
  rowSub: { fontFamily: theme.font.regular, fontSize: 14, color: theme.colors.textMuted, marginTop: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 96, height: 34, paddingHorizontal: 10, borderRadius: 999 },
  chipText: { fontFamily: theme.font.bold, fontSize: 14 },
  muted: { fontFamily: theme.font.regular, fontSize: 17, color: theme.colors.textMuted, paddingVertical: theme.spacing(0.75) },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(0.5) },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), paddingVertical: theme.spacing(0.75), minHeight: 52 },
  deleteButton: { padding: theme.spacing(1) },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.teal,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: theme.colors.teal },
  taskText: { flex: 1, fontFamily: theme.font.regular, fontSize: theme.fontSize.body, color: theme.colors.text, lineHeight: 26 },
  taskTextDone: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  addRow: { flexDirection: 'row', gap: theme.spacing(1), marginTop: theme.spacing(1) },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.teal + '30',
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing(1.75),
    fontSize: 18,
    minHeight: 52,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  addButton: { width: 52, height: 52, borderRadius: theme.radiusSm, backgroundColor: theme.colors.teal, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { opacity: 0.5 },
});
