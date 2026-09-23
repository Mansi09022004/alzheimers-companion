/** "People I know" — a horizontal row of familiar faces (initials), real backend data. */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FamiliarPerson } from '../api/people';
import { PersonAvatar } from './PersonAvatar';
import { theme } from '../theme';

export function PeopleRow({
  people,
  loading,
  onPressPerson,
}: {
  people: FamiliarPerson[];
  loading: boolean;
  onPressPerson: () => void;
}) {
  if (loading) {
    return <View style={styles.skeleton} />;
  }

  if (people.length === 0) {
    return (
      <Text style={styles.empty}>No one has been added yet — your family can add people from the caregiver app.</Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {people.map((p) => (
        <Pressable key={p.id} onPress={onPressPerson} style={styles.person} accessibilityRole="button" accessibilityLabel={`${p.display_name}, ${p.relationship_label}`}>
          <PersonAvatar name={p.display_name} photoUrl={p.photo_url} size={112} />
          <Text style={styles.name} numberOfLines={1}>{p.display_name}</Text>
          <Text style={styles.relation} numberOfLines={1}>{p.relationship_label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: theme.spacing(2.5), paddingRight: theme.spacing(1) },
  person: { alignItems: 'center', width: 124 },
  name: { marginTop: 8, fontFamily: theme.font.bold, fontSize: 15, color: theme.colors.text, textAlign: 'center' },
  relation: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  empty: { fontFamily: theme.font.regular, fontSize: 16, color: theme.colors.textMuted, lineHeight: 24 },
  skeleton: { height: 90, borderRadius: theme.radiusSm, backgroundColor: theme.colors.surfaceMuted },
});
