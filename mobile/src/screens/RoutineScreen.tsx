/** Today's routine: a simple checklist. Tap a row to mark it done / not done. */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { completeRoutine, routineToday, type RoutineToday } from '../api/routine';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

export function RoutineScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<RoutineToday[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems(await routineToday(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (it: RoutineToday) => {
    if (!token) return;
    setItems((prev) =>
      prev.map((x) => (x.routine_item_id === it.routine_item_id ? { ...x, done: !x.done } : x)),
    );
    try {
      await completeRoutine(it.routine_item_id, !it.done, token);
    } catch {
      load(); // revert on failure
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {!loading && items.length === 0 && (
          <Text style={styles.empty}>Nothing planned for today.</Text>
        )}
        {items.map((it) => (
          <Pressable
            key={it.routine_item_id}
            style={[styles.row, it.done && styles.rowDone]}
            onPress={() => toggle(it)}
          >
            <View style={[styles.check, it.done && styles.checkOn]}>
              {it.done && <Text style={styles.tick}>✓</Text>}
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.title, it.done && styles.titleDone]}>{it.title}</Text>
              <Text style={styles.time}>{it.time_of_day}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingVertical: theme.spacing(2), paddingBottom: theme.spacing(6) },
  empty: { fontSize: theme.fontSize.body, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing(4) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(3),
  },
  rowDone: { opacity: 0.6 },
  check: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOn: { backgroundColor: theme.colors.primary },
  tick: { color: theme.colors.primaryText, fontSize: 22, fontWeight: '800' },
  textCol: { flex: 1 },
  title: { fontSize: theme.fontSize.title, color: theme.colors.text, fontWeight: '700' },
  titleDone: { textDecorationLine: 'line-through' },
  time: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
});
