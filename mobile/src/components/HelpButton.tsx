/**
 * A calm, persistent "I need help" affordance — meant to sit quietly in a corner
 * of every important screen rather than dominate the UI like an emergency panel.
 *
 * Preserves the existing SOS contract (`/patient/sos`) exactly; the only change
 * from the old Home-only button is presentation, and that the result now names
 * who was actually contacted (data already returned by the API, previously unused).
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { triggerSos } from '../api/sos';
import { useAuth } from '../auth/AuthContext';
import { speak } from '../speech';
import { theme } from '../theme';
import { ConfirmDialog } from './ConfirmDialog';

export function HelpButton() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'confirm' | 'result'>('idle');
  const [result, setResult] = useState<{ title: string; message: string } | null>(null);

  const send = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const r = await triggerSos(token);
      const contacted = r.notified_contacts.length ? r.notified_contacts.join(', ') : null;
      speak(r.message);
      setResult({ title: 'Help is on the way', message: contacted ? `${r.message} Contacted: ${contacted}.` : r.message });
    } catch {
      setResult({ title: 'Could not send', message: 'Please tell someone nearby, or try again.' });
    } finally {
      setBusy(false);
      setStage('result');
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setStage('confirm')}
        disabled={busy}
        style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="I need help"
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.dangerText} size="small" />
        ) : (
          <>
            <Ionicons name="help-buoy" size={24} color={theme.colors.dangerText} />
            <Text style={styles.label}>I need help</Text>
          </>
        )}
      </Pressable>

      <ConfirmDialog
        visible={stage === 'confirm'}
        title="Do you need help?"
        message=""
        confirmLabel="Yes, call for help"
        cancelLabel="No, I'm okay"
        destructive
        onConfirm={() => {
          setStage('idle');
          send();
        }}
        onCancel={() => setStage('idle')}
      />

      <ConfirmDialog
        visible={stage === 'result'}
        title={result?.title ?? ''}
        message={result?.message ?? ''}
        cancelLabel="OK"
        onCancel={() => setStage('idle')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    backgroundColor: theme.colors.danger,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: theme.colors.danger,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  label: { fontFamily: theme.font.bold, fontSize: 18, color: theme.colors.dangerText },
});
