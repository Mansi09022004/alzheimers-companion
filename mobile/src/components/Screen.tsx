import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';

/** Full-screen container with safe-area padding and the app background. */
export function Screen({ children, center }: { children: ReactNode; center?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, center && styles.center]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1, padding: theme.spacing(3) },
  center: { justifyContent: 'center', alignItems: 'center' },
});
