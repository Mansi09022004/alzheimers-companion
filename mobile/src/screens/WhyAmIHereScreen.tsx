/** "Why am I here?" — a calm reassurance about place and time. */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    <Screen center showHelp>
      <View style={styles.iconWrap}>
        <Ionicons name="location" size={32} color={theme.colors.sage} />
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.message}>{data?.message ?? '…'}</Text>
        </View>
      )}
      <BigButton label="Tell me again" onPress={load} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  card: {
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.sage + '25',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(4),
    ...theme.shadow.card,
  },
  message: {
    fontSize: theme.fontSize.title,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 38,
  },
  error: { fontSize: theme.fontSize.body, color: theme.colors.danger, marginBottom: theme.spacing(3) },
});
