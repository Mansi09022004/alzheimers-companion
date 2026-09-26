/**
 * "Who can help me?" — the people the patient trusts, each with a big, unmistakable
 * Call button. Reads the same People rows the caregiver manages; nothing is duplicated.
 * Anyone without a saved number still gets a Call button, which explains what's missing
 * rather than doing nothing.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { myPeople, type FamiliarPerson } from '../api/people';
import { useAuth } from '../auth/AuthContext';
import { PersonAvatar } from '../components/PersonAvatar';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

const CARD_TINTS = ['#E6EFDF', '#F1EAF6', '#FBEBE2', '#E3F0E8', '#F7E9EE'];

/** Keeps digits and a leading "+" so "+91 98765-43210" dials cleanly. */
const dialable = (phone: string) => phone.replace(/[^\d+]/g, '');

export function WhoCanHelpScreen() {
  const { token } = useAuth();
  const [people, setPeople] = useState<FamiliarPerson[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<{ personId: number; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadError(false);
    try {
      const list = await myPeople(token);
      // People we can actually call come first.
      setPeople([...list].sort((a, b) => Number(!!b.phone?.trim()) - Number(!!a.phone?.trim())));
    } catch {
      setLoadError(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (p: FamiliarPerson) => {
    const number = p.phone?.trim();
    if (!number) {
      setNotice({ personId: p.id, text: `There is no phone number saved for ${p.display_name}. Please ask a family member to add it.` });
      return;
    }
    setNotice(null);
    try {
      const url = `tel:${dialable(number)}`;
      // On web, Linking would open a blank tab; navigating in place hands `tel:` to the dialer.
      if (Platform.OS === 'web') window.location.href = url;
      else await Linking.openURL(url);
    } catch {
      setNotice({ personId: p.id, text: `We couldn't start the call. You can dial ${number} yourself.` });
    }
  };

  return (
    <Screen showHelp>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Tap Call to talk to someone who can help you.</Text>

        {people === null && !loadError && <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />}

        {loadError && (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Couldn't load your people</Text>
            <Text style={styles.messageText}>Please check your connection and try again.</Text>
            <Pressable onPress={load} style={styles.retry} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {people?.length === 0 && (
          <View style={styles.messageCard}>
            <Ionicons name="people-outline" size={30} color={theme.colors.primary} />
            <Text style={styles.messageTitle}>No one added yet</Text>
            <Text style={styles.messageText}>Your family can add people from the caregiver app.</Text>
          </View>
        )}

        {people?.map((p, i) => (
          <View key={p.id} style={[styles.card, { backgroundColor: CARD_TINTS[i % CARD_TINTS.length] }]}>
            <View style={styles.top}>
              <PersonAvatar name={p.display_name} photoUrl={p.photo_url} size={76} />
              <View style={styles.who}>
                <Text style={styles.name} numberOfLines={2}>{p.display_name}</Text>
                <Text style={styles.relation} numberOfLines={1}>{p.relationship_label}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => call(p)}
              style={({ pressed }) => [styles.callButton, !p.phone?.trim() && styles.callButtonMuted, { opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${p.display_name}, your ${p.relationship_label}`}
            >
              <Ionicons name="call" size={26} color="#FFFFFF" />
              <Text style={styles.callText}>Call</Text>
            </Pressable>
            {notice?.personId === p.id && <Text style={styles.notice}>{notice.text}</Text>}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(1.75), paddingBottom: theme.spacing(12) },
  intro: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.textMuted },
  spinner: { marginTop: theme.spacing(4) },

  card: { borderRadius: theme.radiusLg, padding: theme.spacing(2), gap: theme.spacing(1.5), ...theme.shadow.card },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.75) },
  who: { flex: 1, minWidth: 0 },
  name: { fontFamily: theme.font.bold, fontSize: 26, lineHeight: 32, color: theme.colors.text },
  relation: { fontFamily: theme.font.regular, fontSize: 19, color: theme.colors.textMuted, marginTop: 2 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 64,
    borderRadius: 999,
    backgroundColor: theme.colors.sage,
  },
  callButtonMuted: { backgroundColor: theme.colors.textMuted },
  callText: { fontFamily: theme.font.bold, fontSize: 23, color: '#FFFFFF' },
  notice: { fontFamily: theme.font.bold, fontSize: 17, lineHeight: 24, color: theme.colors.danger },

  messageCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
  },
  messageTitle: { fontFamily: theme.font.bold, fontSize: 21, color: theme.colors.text, textAlign: 'center' },
  messageText: { fontFamily: theme.font.regular, fontSize: 17, color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 6, minHeight: 48, borderRadius: 999, paddingHorizontal: 24, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: theme.font.bold, fontSize: 17, color: '#FFFFFF' },
});
