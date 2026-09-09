/**
 * Push notifications (medication reminders, Memory Moments).
 *
 * Registers the device's Expo push token with the backend. No-op on web and in
 * Expo Go on Android SDK 53+ (remote push there needs a dev build) — the app still
 * works, it just won't receive background reminders.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(authToken: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();
    if (expoPushToken) {
      await api('/patient/push-token', {
        method: 'POST',
        token: authToken,
        body: { expo_push_token: expoPushToken },
      });
    }
  } catch {
    /* remote push unavailable on this build — fine */
  }
}
