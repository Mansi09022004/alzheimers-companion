/**
 * "My People" — everyone the patient knows (real backend data) as a tidy two-column grid
 * of faces with their relationship and how many memories they appear in. The "Who is
 * this?" camera check sits right at the top, where it's needed.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { myMemories, type PatientMemory } from '../api/memories';
import { myPeople, type FamiliarPerson } from '../api/people';
import { PersonAvatar } from '../components/PersonAvatar';
import { ACCENTS, TabScreen } from '../components/TabScreen';
import { useAuth } from '../auth/AuthContext';
import type { PeopleStackParamList } from '../navigation';
import { theme } from '../theme';

type Props = NativeStackScreenProps<PeopleStackParamList, 'PeopleHome'>;

const PERSON_TINTS = ['#E6EFDF', '#F1EAF6', '#EDF4E7', '#FBEBE2', '#E3F0E8', '#F7E9EE'];

export function PeopleScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [people, setPeople] = useState<FamiliarPerson[] | null>(null);
  const [memories, setMemories] = useState<PatientMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    const [p, m] = await Promise.all([myPeople(token).catch(() => []), myMemories(token).catch(() => [])]);
    setPeople(p);
    setMemories(m);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const memoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const m of memories) if (m.person_id !== null) counts.set(m.person_id, (counts.get(m.person_id) ?? 0) + 1);
    return counts;
  }, [memories]);

  const count = people?.length ?? 0;
  const subtitle = count > 0 ? `${count} ${count === 1 ? 'person' : 'people'} you know and love` : 'Family and friends';

  return (
    <TabScreen title="My people" subtitle={subtitle} icon="people" accent={ACCENTS.people} refreshing={loading} onRefresh={load}>
      <Pressable
        style={({ pressed }) => [styles.whoRow, { opacity: pressed ? 0.88 : 1 }]}
        onPress={() => navigation.navigate('WhoIsThis')}
        accessibilityRole="button"
        accessibilityLabel="Who is this? Take a photo to find out"
      >
        <View style={styles.whoIcon}>
          <Ionicons name="camera" size={26} color={theme.colors.primaryDark} />
        </View>
        <View style={styles.whoText}>
          <Text style={styles.whoTitle}>Who is this?</Text>
          <Text style={styles.whoSub}>Take a photo to find out</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.85)" />
      </Pressable>

      {!loading && count === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={30} color={theme.colors.primary} />
          <Text style={styles.emptyTitle}>No one added yet</Text>
          <Text style={styles.empty}>Your family can add people from the caregiver app.</Text>
        </View>
      )}

      <View style={styles.grid}>
        {people?.map((p, i) => {
          const memoriesWith = memoryCounts.get(p.id) ?? 0;
          return (
            <View key={p.id} style={[styles.tile, { backgroundColor: PERSON_TINTS[i % PERSON_TINTS.length] }]}>
              <View style={styles.avatarRing}>
                <PersonAvatar name={p.display_name} photoUrl={p.photo_url} size={72} />
              </View>
              <Text style={styles.name} numberOfLines={1}>{p.display_name}</Text>
              <Text style={styles.relation} numberOfLines={1}>{p.relationship_label}</Text>
              <View style={[styles.memoryPill, memoriesWith === 0 && styles.memoryPillEmpty]}>
                <Ionicons name="heart" size={12} color={memoriesWith > 0 ? theme.colors.accent : theme.colors.textMuted} />
                <Text style={[styles.memoryText, memoriesWith === 0 && styles.memoryTextEmpty]}>
                  {memoriesWith === 0 ? 'No memories yet' : `${memoriesWith} ${memoriesWith === 1 ? 'memory' : 'memories'}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minHeight: 76,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius,
    paddingHorizontal: theme.spacing(1.75),
    paddingVertical: theme.spacing(1.25),
    ...theme.shadow.soft,
  },
  whoIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  whoText: { flex: 1, minWidth: 0 },
  whoTitle: { fontFamily: theme.font.bold, fontSize: 21, color: '#FFFFFF' },
  whoSub: { fontFamily: theme.font.regular, fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 1 },

  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.sage + '30',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(2),
  },
  emptyTitle: { fontFamily: theme.font.bold, fontSize: 20, color: theme.colors.text },
  empty: { fontFamily: theme.font.regular, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },

  // Two equal columns; every tile has the same structure (photo, name, relation, memory count) so heights match.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: theme.spacing(1.5) },
  tile: {
    width: '48.5%',
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(1),
    ...theme.shadow.card,
  },
  avatarRing: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing(1) },
  name: { width: '100%', fontFamily: theme.font.bold, fontSize: 20, lineHeight: 25, color: theme.colors.text, textAlign: 'center' },
  relation: { width: '100%', fontFamily: theme.font.regular, fontSize: 16, lineHeight: 21, color: theme.colors.textMuted, textAlign: 'center', marginTop: 1 },
  memoryPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: theme.spacing(1), height: 28, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingHorizontal: 12 },
  memoryPillEmpty: { backgroundColor: 'rgba(255,255,255,0.5)' },
  memoryText: { fontFamily: theme.font.bold, fontSize: 13, color: theme.colors.text },
  memoryTextEmpty: { fontFamily: theme.font.regular, color: theme.colors.textMuted },
});
