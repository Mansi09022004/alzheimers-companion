/** Emergency SOS. */
import * as Location from 'expo-location';

import { api } from './client';

export type SosResult = {
  alert_id: number;
  message: string;
  notified_caregivers: number;
  notified_contacts: string[];
};

export async function triggerSos(token: string): Promise<SosResult> {
  let coords: { lat: number; lng: number } | undefined;
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (granted) {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }
  } catch {
    /* SOS must work even if we can't get a fresh fix */
  }
  return api<SosResult>('/patient/sos', { method: 'POST', body: { ...coords }, token });
}
