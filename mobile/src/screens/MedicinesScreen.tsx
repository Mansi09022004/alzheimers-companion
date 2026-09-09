/** Today's medicines: each dose with a clear status and a big "I took it" button. */
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { markDose, medicationsToday, type DoseSlot } from '../api/medications';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

const LABEL: Record<DoseSlot['status'], string> = {
  upcoming: 'Later today',
  due: 'Time to take',
  taken: 'Taken ✓',
  skipped: 'Skipped',
  missed: 'Missed',
};
const COLOR: Record<DoseSlot['status'], string> = {
  upcoming: theme.colors.textMuted,
  due: theme.colors.primary,
  taken: '#2E7D32',
  skipped: theme.colors.textMuted,
  missed: theme.colors.danger,
};

export function MedicinesScreen() {
  const { token } = useAuth();
  const [slots, setSlots] = useState<DoseSlot[]>([]);
  const [loading, setLoading] = useState(true);

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
    await markDose(s.medication_id, s.time, 'taken', token);
    load();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {!loading && slots.length === 0 && (
          <Text style={styles.empty}>No medicines scheduled for today.</Text>
        )}
        {slots.map((s) => (
          <View key={`${s.medication_id}-${s.time}`} style={styles.card}>
            <Text style={styles.time}>{s.time}</Text>
            <Text style={styles.name}>{s.name}</Text>
            {s.dosage_note ? <Text style={styles.dose}>{s.dosage_note}</Text> : null}
            <Text style={[styles.status, { color: COLOR[s.status] }]}>{LABEL[s.status]}</Text>
            {(s.status === 'due' || s.status === 'upcoming' || s.status === 'missed') && (
              <BigButton label="I took it" onPress={() => take(s)} />
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(6) },
  empty: { fontSize: theme.fontSize.body, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing(4) },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(3),
    gap: theme.spacing(1),
  },
  time: { fontSize: 16, color: theme.colors.textMuted, fontWeight: '700' },
  name: { fontSize: theme.fontSize.title, color: theme.colors.text, fontWeight: '700' },
  dose: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
  status: { fontSize: theme.fontSize.body, fontWeight: '700', marginBottom: theme.spacing(1) },
});
