/**
 * Shown when this device is set up as "Caregiver" — the caregiver experience
 * lives in the web dashboard, so this screen just opens it and offers a way
 * back to the role picker.
 */
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRole } from '../auth/RoleContext';
import { BigButton } from '../components/BigButton';
import { CompanionMark } from '../components/CompanionMark';
import { Screen } from '../components/Screen';
import { DASHBOARD_URL } from '../config';
import { theme } from '../theme';

export function CaregiverScreen() {
  const { clearRole } = useRole();

  return (
    <Screen center>
      <View style={styles.box}>
        <View style={styles.markWrap}>
          <CompanionMark size={72} />
        </View>
        <Text style={styles.title}>Caregiver dashboard</Text>
        <Text style={styles.help}>
          The caregiver dashboard opens in your browser, where you can log in and manage care.
        </Text>

        <BigButton label="Open caregiver dashboard" icon="open-outline" onPress={() => Linking.openURL(DASHBOARD_URL)} />

        <Pressable onPress={clearRole} style={styles.switchLink} accessibilityRole="button">
          <Text style={styles.switchText}>Switch role</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: 420, gap: theme.spacing(2) },
  markWrap: { alignItems: 'center', marginBottom: theme.spacing(1) },
  title: { fontSize: theme.fontSize.title, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  help: { fontSize: theme.fontSize.body, color: theme.colors.textMuted, lineHeight: 28, textAlign: 'center' },
  switchLink: { alignItems: 'center', marginTop: theme.spacing(2), padding: theme.spacing(1) },
  switchText: { fontSize: theme.fontSize.body, color: theme.colors.textMuted, textDecorationLine: 'underline' },
});
