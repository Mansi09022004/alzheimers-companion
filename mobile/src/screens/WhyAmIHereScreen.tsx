/** "Why am I here?" — a calm reassurance about place and time. */
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { whyAmIHere, type WhyAmIHere } from '../api/context';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { speak } from '../speech';
import { theme } from '../theme';

export function WhyAmIHereScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<WhyAmIHere | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setError(null);
    try {
      const r = await whyAmIHere(token);
      setData(r);
      speak(r.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen center>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.message}>{data?.message ?? '…'}</Text>
      )}
      <BigButton label="Tell me again" onPress={load} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: theme.fontSize.title,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: theme.spacing(4),
  },
  error: { fontSize: theme.fontSize.body, color: theme.colors.danger, marginBottom: theme.spacing(3) },
});
