import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HelpButton } from './HelpButton';
import { theme } from '../theme';

/**
 * Full-screen container with safe-area padding and the app background.
 * `showHelp` renders the calm, persistent "Need help" affordance in the corner —
 * pass it on every screen the patient might reach for help from.
 */
export function Screen({
  children,
  center,
  showHelp,
  background,
}: {
  children: ReactNode;
  center?: boolean;
  showHelp?: boolean;
  background?: string;
}) {
  return (
    <SafeAreaView style={[styles.safe, background ? { backgroundColor: background } : null]}>
      <View style={[styles.inner, center && styles.center]}>{children}</View>
      {showHelp && (
        <View style={styles.helpWrap} pointerEvents="box-none">
          <HelpButton />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1, padding: theme.spacing(3) },
  center: { justifyContent: 'center', alignItems: 'center' },
  helpWrap: { position: 'absolute', right: theme.spacing(2.5), bottom: theme.spacing(2.5) },
});
