/**
 * First-run screen. A caregiver generates a pairing code on the dashboard; the
 * patient (or caregiver setting up the device) types it here once.
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../api/client';
import { BigButton } from '../components/BigButton';
import { CompanionMark } from '../components/CompanionMark';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

export function PairingScreen() {
  const { pair } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await pair(code);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not pair this device.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen center>
      <View style={styles.box}>
        <View style={styles.markWrap}>
          <CompanionMark size={72} />
        </View>
        <Text style={styles.title}>Set up this device</Text>
        <Text style={styles.help}>
          Ask your family member for the 8-letter setup code from the caregiver app.
        </Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="ABCD1234"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          style={styles.input}
          accessibilityLabel="Setup code"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <BigButton label="Connect" onPress={onSubmit} loading={busy} disabled={code.length < 4} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: 420, gap: theme.spacing(2) },
  markWrap: { alignItems: 'center', marginBottom: theme.spacing(1) },
  title: { fontSize: theme.fontSize.title, fontWeight: '700', color: theme.colors.text },
  help: { fontSize: theme.fontSize.body, color: theme.colors.textMuted, lineHeight: 28 },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.primary + '30',
    borderRadius: theme.radius,
    padding: theme.spacing(2),
    fontSize: 30,
    letterSpacing: 6,
    textAlign: 'center',
    backgroundColor: theme.colors.primaryTint,
    color: theme.colors.text,
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.body },
});
