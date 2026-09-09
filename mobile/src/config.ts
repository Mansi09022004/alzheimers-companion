/**
 * App configuration.
 *
 * `EXPO_PUBLIC_*` env vars are inlined at build time by Expo and are safe to read
 * on the client. Put the value in `mobile/.env`:
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.1.5:8000
 *
 * - Android emulator:  http://10.0.2.2:8000
 * - iOS simulator:     http://localhost:8000
 * - Real device:       http://<your-computer-LAN-IP>:8000  (same Wi-Fi)
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';

export const API_V1 = `${API_URL}/api/v1`;
