/**
 * Location reporting.
 *
 * Foreground: while the app is open we send a fix every few minutes. This works
 * everywhere, including Expo Go.
 *
 * Background: `expo-location`'s background updates + a TaskManager task are wired
 * up too, but background location on iOS/Android needs a custom dev build (not
 * Expo Go) and the OS may still delay or drop updates. We treat missing updates
 * as "unknown", never "safe".
 *
 * Coarse interval + modest accuracy on purpose — continuous high-accuracy GPS
 * drains the battery fast, and for safe-zone checks we don't need metre precision.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { api } from './api/client';

const BG_TASK = 'alz-location-updates';
const INTERVAL_MS = 3 * 60 * 1000;

let foregroundTimer: ReturnType<typeof setInterval> | null = null;
let currentToken: string | null = null;

async function send(token: string, loc: Location.LocationObject) {
  try {
    await api('/patient/location', {
      method: 'POST',
      token,
      body: {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy_m: loc.coords.accuracy ?? undefined,
        recorded_at: new Date(loc.timestamp).toISOString(),
      },
    });
  } catch {
    /* a dropped ping is fine; the next one will carry the position */
  }
}

TaskManager.defineTask(BG_TASK, async ({ data, error }) => {
  if (error || !currentToken) return;
  const locs = (data as { locations?: Location.LocationObject[] })?.locations ?? [];
  for (const loc of locs) await send(currentToken, loc);
});

export async function startLocationReporting(token: string) {
  currentToken = token;

  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return;

  // one immediate fix, then a coarse interval while the app is open
  const tick = async () => {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await send(token, loc);
  };
  tick();
  foregroundTimer = setInterval(tick, INTERVAL_MS);

  // best-effort background updates (no-op in Expo Go)
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.granted && !(await Location.hasStartedLocationUpdatesAsync(BG_TASK))) {
      await Location.startLocationUpdatesAsync(BG_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: INTERVAL_MS,
        distanceInterval: 75,
        showsBackgroundLocationIndicator: false,
        foregroundService: {
          notificationTitle: "Alzheimer's Companion",
          notificationBody: 'Sharing location with your caregiver.',
        },
      });
    }
  } catch {
    /* background not available on this build/platform */
  }
}

export async function stopLocationReporting() {
  currentToken = null;
  if (foregroundTimer) {
    clearInterval(foregroundTimer);
    foregroundTimer = null;
  }
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BG_TASK)) {
      await Location.stopLocationUpdatesAsync(BG_TASK);
    }
  } catch {
    /* ignore */
  }
}
