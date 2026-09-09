/**
 * The patient's home screen.
 *
 *   - "Who is this?"      -> camera + contextual face recognition
 *   - "Ask a question"    -> voice / text RAG assistant
 *   - "Why am I here?"    -> Context Engine reassurance
 *   - "I need help"       -> Phase 15 (SOS) — placeholder
 *   - Memory Moment card  -> one gentle memory, refreshable, spoken aloud
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { memoryMoment, type MemoryMoment } from '../api/context';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation';
import { speak } from '../speech';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ navigation }: Props) {
  const { patient, token, signOut } = useAuth();
  const [taps, setTaps] = useState(0);
  const [moment, setMoment] = useState<MemoryMoment | null>(null);

  const firstName = patient?.full_name?.split(' ')[0] ?? 'there';

  const loadMoment = async (announce = false) => {
    if (!token) return;
    try {
      const m = await memoryMoment(token);
      setMoment(m);
      if (announce && m.available) speak(m.message);
    } catch {
      /* a missing memory moment is not worth interrupting the patient */
    }
  };

  useEffect(() => {
    loadMoment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {moment?.available && (
          <Pressable style={styles.momentCard} onPress={() => loadMoment(true)}>
            <Text style={styles.momentLabel}>A memory</Text>
            <Text style={styles.momentText}>{moment.message}</Text>
          </Pressable>
        )}

        <View style={styles.actions}>
          <BigButton label="Who is this?" onPress={() => navigation.navigate('WhoIsThis')} />
          <BigButton label="Ask a question" onPress={() => navigation.navigate('Ask')} />
          <BigButton label="Today's plan" onPress={() => navigation.navigate('Routine')} />
          <BigButton label="My medicines" onPress={() => navigation.navigate('Medicines')} />
          <BigButton label="Why am I here?" onPress={() => navigation.navigate('WhyAmIHere')} />
          <BigButton
            label="I need help"
            variant="danger"
            onPress={() => Alert.alert('I need help', 'Coming soon.')}
          />
        </View>

        <Text style={styles.disclaimer}>This is a prototype and not a medical device.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(4) },
  date: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
  hello: { fontSize: theme.fontSize.hero, fontWeight: '800', color: theme.colors.text },
  momentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(3),
    marginTop: theme.spacing(1),
  },
  momentLabel: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '700', marginBottom: 6 },
  momentText: { fontSize: theme.fontSize.body, color: theme.colors.text, lineHeight: 28 },
  actions: { gap: theme.spacing(2), marginTop: theme.spacing(3) },
  disclaimer: {
    marginTop: theme.spacing(4),
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
