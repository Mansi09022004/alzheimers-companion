import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { RoleProvider, useRole } from './src/auth/RoleContext';
import { CompanionMark } from './src/components/CompanionMark';
import { AppNavigator } from './src/navigation';
import { CaregiverScreen } from './src/screens/CaregiverScreen';
import { PairingScreen } from './src/screens/PairingScreen';
import { RoleSelectScreen } from './src/screens/RoleSelectScreen';
import { theme } from './src/theme';

/**
 * No navigation library yet — with only two screens, we render based on auth state.
 * A router (expo-router) is introduced in Phase 5 when screens multiply.
 */
function PatientRoot() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <CompanionMark size={72} />
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      </View>
    );
  }
  return status === 'paired' ? <AppNavigator /> : <PairingScreen />;
}

/** First launch (or after "Switch role") asks who this device is for; the choice is remembered. */
function RoleGate() {
  const { role, loading, clearRole } = useRole();

  // A "Switch to Patient app" link from the caregiver dashboard lands here with
  // ?switchRole=1 — force this browser tab back to the role picker, once, then
  // clean the URL so a refresh doesn't re-trigger it.
  useEffect(() => {
    if (Platform.OS !== 'web' || loading || role === null) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('switchRole') !== '1') return;
    clearRole();
    params.delete('switchRole');
    const query = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
  }, [loading, role, clearRole]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      </View>
    );
  }
  if (role === null) return <RoleSelectScreen />;
  if (role === 'caregiver') return <CaregiverScreen />;
  return (
    <AuthProvider>
      <PatientRoot />
    </AuthProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <RoleProvider>
        <StatusBar style="dark" />
        <RoleGate />
      </RoleProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: { marginTop: theme.spacing(2) },
});
