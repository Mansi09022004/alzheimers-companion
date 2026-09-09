/**
 * The patient's home screen.
 *
 * Phase 4: greeting + the three primary actions as placeholders. Real behaviour
 * arrives in later phases:
 *   - "Who is this?"     -> Phase 5 (face recognition)
 *   - "Ask a question"   -> Phase 8/9 (RAG + voice)
 *   - "I need help"      -> Phase 15 (SOS)
 */
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const { patient, signOut } = useAuth();
  const [taps, setTaps] = useState(0); // hidden: 5 taps on the date reveals "unpair"

  const firstName = patient?.full_name?.split(' ')[0] ?? 'there';
  const soon = (what: string) => Alert.alert(what, 'Coming soon.');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={styles.date}
          onPress={() => {
            const n = taps + 1;
            setTaps(n);
            if (n >= 5) {
              Alert.alert('Unpair this device?', 'The caregiver will need to set it up again.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unpair', style: 'destructive', onPress: signOut },
              ]);
              setTaps(0);
            }
          }}
        >
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>

        <Text style={styles.hello}>
          {greeting()}, {firstName}
        </Text>
        {patient?.home_label ? (
          <Text style={styles.sub}>You are at {patient.home_label}.</Text>
        ) : null}

        <View style={styles.actions}>
          <BigButton label="Who is this?" onPress={() => soon('Who is this?')} />
          <BigButton label="Ask a question" onPress={() => soon('Ask a question')} />
          <BigButton label="I need help" variant="danger" onPress={() => soon('I need help')} />
        </View>

        <Text style={styles.disclaimer}>
          This is a prototype and not a medical device.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(4) },
  date: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
  hello: { fontSize: theme.fontSize.hero, fontWeight: '800', color: theme.colors.text },
  sub: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
  actions: { gap: theme.spacing(2), marginTop: theme.spacing(3) },
  disclaimer: {
    marginTop: theme.spacing(4),
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
