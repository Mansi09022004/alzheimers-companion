/**
 * "Familiar Things" — a warm, simple overview of who and what the patient knows:
 * their people (from the People list) and the places, food and activities their own
 * approved memories mention. Pure read-only view over existing data — nothing new
 * is stored, and nothing appears here without real evidence behind it.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { myMemories, type PatientMemory } from '../api/memories';
import { myPeople, type FamiliarPerson } from '../api/people';
import { PersonAvatar } from '../components/PersonAvatar';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { deriveFamiliarThings, type FamiliarTagItem } from '../lib/familiarThings';
import { theme } from '../theme';

const TAG_STYLE: Record<FamiliarTagItem['category'], { caption: string; tint: string; fg: string }> = {
  place: { caption: 'Familiar place', tint: theme.colors.sageTint, fg: theme.colors.sage },
  food: { caption: 'Likes', tint: theme.colors.peachTint, fg: '#B5652E' },
  activity: { caption: 'Enjoys', tint: theme.colors.lavenderTint, fg: theme.colors.lavender },
};

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function TagCard({ tag }: { tag: FamiliarTagItem }) {
  const s = TAG_STYLE[tag.category];
  return (
    <View style={[styles.tagCard, { backgroundColor: s.tint }]}>
      <Text style={styles.tagEmoji}>{tag.emoji}</Text>
      <Text style={styles.tagLabel} numberOfLines={1}>{tag.label}</Text>
      <Text style={[styles.tagCaption, { color: s.fg }]}>{s.caption}</Text>
    </View>
  );
}

export function FamiliarThingsScreen() {
  const { token } = useAuth();
  const [people, setPeople] = useState<FamiliarPerson[] | null>(null);
  const [memories, setMemories] = useState<PatientMemory[] | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [p, m] = await Promise.all([
      myPeople(token).catch(() => []),
      myMemories(token).catch(() => []),
    ]);
    setPeople(p);
    setMemories(m);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (people === null || memories === null) {
    return (
      <Screen center showHelp>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </Screen>
    );
  }

  const things = deriveFamiliarThings(people, memories);
  const isEmpty = things.people.length === 0 && things.places.length === 0 && things.foods.length === 0 && things.activities.length === 0;

  return (
    <Screen showHelp>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>People and things you know well.</Text>

        {isEmpty && (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={30} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>As your family adds people and memories, they'll show up here.</Text>
          </View>
        )}

        {things.people.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>❤️ People I Know</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
              {things.people.map((p) => (
                <View key={p.id} style={styles.personChip}>
                  <PersonAvatar name={p.name} photoUrl={p.photoUrl} size={56} />
                  <Text style={styles.personName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.personRelation} numberOfLines={1}>{p.relationship}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {things.places.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>🌳 Places I Know</SectionLabel>
            <View style={styles.tagWrap}>
              {things.places.map((t) => <TagCard key={t.label} tag={t} />)}
            </View>
          </View>
        )}

        {things.foods.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>🥭 Things I Like</SectionLabel>
            <View style={styles.tagWrap}>
              {things.foods.map((t) => <TagCard key={t.label} tag={t} />)}
            </View>
          </View>
        )}

        {things.activities.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>🃏 Things I Enjoy</SectionLabel>
            <View style={styles.tagWrap}>
              {things.activities.map((t) => <TagCard key={t.label} tag={t} />)}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(0.5), paddingBottom: theme.spacing(6) },
  intro: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.textMuted, marginBottom: theme.spacing(1) },

  emptyCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
  },
  emptyTitle: { fontFamily: theme.font.bold, fontSize: 21, color: theme.colors.text, textAlign: 'center' },
  emptyText: { fontFamily: theme.font.regular, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },

  section: { marginBottom: theme.spacing(2) },
  sectionLabel: { fontFamily: theme.font.bold, fontSize: 19, color: theme.colors.text, marginBottom: theme.spacing(1) },

  peopleRow: { flexDirection: 'row', gap: theme.spacing(2), paddingVertical: 2, paddingRight: theme.spacing(1) },
  personChip: { alignItems: 'center', width: 76, gap: 3 },
  personName: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.text, textAlign: 'center' },
  personRelation: { fontFamily: theme.font.regular, fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  tagCard: {
    width: '30%',
    minWidth: 96,
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(1.25),
    paddingHorizontal: theme.spacing(0.75),
    alignItems: 'center',
    gap: 2,
  },
  tagEmoji: { fontSize: 26 },
  tagLabel: { fontFamily: theme.font.bold, fontSize: 15, color: theme.colors.text, textAlign: 'center' },
  tagCaption: { fontFamily: theme.font.regular, fontSize: 12, textAlign: 'center' },
});
