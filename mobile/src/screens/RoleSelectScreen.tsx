/**
 * First-launch screen: "Who's using this device?" — decides which experience this
 * device shows from now on. The choice is remembered (see RoleContext), so this
 * screen doesn't appear again until the user switches role from Settings.
 *
 * Visually matches the rest of the patient app's warm, premium language (soft
 * gradient wash, the brand mark, tinted role cards) rather than a plain form —
 * this is the very first thing anyone sees.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRole, type Role } from '../auth/RoleContext';
import { CompanionMark } from '../components/CompanionMark';
import { theme } from '../theme';

const ROLES: {
  role: Role;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  fg: string;
  tint: string;
}[] = [
  {
    role: 'patient',
    icon: 'person',
    title: "I'm a Patient",
    body: 'This device is for the person living with memory changes — reminders, memories and a friendly companion.',
    fg: theme.colors.primaryDark,
    tint: theme.colors.primaryTint,
  },
  {
    role: 'caregiver',
    icon: 'people',
    title: "I'm a Caregiver",
    body: 'Sign in to manage care, memories and safety — from this device or your laptop browser.',
    fg: theme.colors.accent,
    tint: theme.colors.accentTint,
  },
];

export function RoleSelectScreen() {
  const { setRole } = useRole();

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={[theme.colors.lavenderTint, theme.colors.background, theme.colors.sageTint]}
        style={styles.wash}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.markRing}>
            <CompanionMark size={64} />
          </View>
          <Text style={styles.brand}>Alzheimer's Companion</Text>
          <Text style={styles.title}>Who's using this device?</Text>
          <Text style={styles.subtitle}>This sets up this device — you can switch it anytime from Settings.</Text>
        </View>

        <View style={styles.cards}>
          {ROLES.map((r) => (
            <Pressable
              key={r.role}
              onPress={() => setRole(r.role)}
              style={({ pressed }) => [styles.card, { backgroundColor: r.tint, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              accessibilityRole="button"
              accessibilityLabel={r.title}
            >
              <View style={[styles.cardIcon, { backgroundColor: r.fg }]}>
                <Ionicons name={r.icon} size={26} color="#FFFFFF" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.cardBody}>{r.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={r.fg} />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing(3), gap: theme.spacing(4) },
  header: { alignItems: 'center', gap: theme.spacing(1) },
  markRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(0.5),
    ...theme.shadow.soft,
  },
  brand: { fontFamily: theme.font.bold, fontSize: 15, letterSpacing: 0.4, color: theme.colors.primaryDark },
  title: { fontFamily: theme.font.bold, fontSize: 30, lineHeight: 36, color: theme.colors.text, textAlign: 'center', marginTop: theme.spacing(1) },
  subtitle: { fontFamily: theme.font.regular, fontSize: 16, lineHeight: 23, color: theme.colors.textMuted, textAlign: 'center', maxWidth: 340 },
  cards: { gap: theme.spacing(1.75) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    borderRadius: theme.radiusLg,
    padding: theme.spacing(2),
    minHeight: 96,
    ...theme.shadow.card,
  },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontFamily: theme.font.bold, fontSize: 20, color: theme.colors.text },
  cardBody: { fontFamily: theme.font.regular, fontSize: 14, lineHeight: 19, color: theme.colors.textMuted },
});
