/**
 * Holds the device token and the patient's basic info.
 *
 * - the token is kept in the OS secure store (Keychain / Keystore), never plain storage
 * - on launch we read the token and, if present, verify it by calling /patient/me
 * - `pair(code)` exchanges a pairing code for a token; `signOut()` clears it
 *
 * Screens read `useAuth()` and the app root decides what to render based on `status`.
 */
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { api } from '../api/client';
import { startLocationReporting, stopLocationReporting } from '../location';

const TOKEN_KEY = 'device_token';

type Patient = { id: number; full_name: string; date_of_birth: string | null; home_label: string | null };

type AuthState = {
  status: 'loading' | 'unpaired' | 'paired';
  patient: Patient | null;
  token: string | null;
  pair: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!saved) return setStatus('unpaired');
      try {
        const me = await api<Patient>('/patient/me', { token: saved });
        setToken(saved);
        setPatient(me);
        setStatus('paired');
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setStatus('unpaired');
      }
    })();
  }, []);

  const pair = useCallback(async (code: string) => {
    const res = await api<{ access_token: string; patient_id: number; patient_name: string }>(
      '/patient/pair',
      { method: 'POST', body: { pairing_code: code.trim().toUpperCase() } },
    );
    await SecureStore.setItemAsync(TOKEN_KEY, res.access_token);
    const me = await api<Patient>('/patient/me', { token: res.access_token });
    setToken(res.access_token);
    setPatient(me);
    setStatus('paired');
  }, []);

  const signOut = useCallback(async () => {
    await stopLocationReporting();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setPatient(null);
    setStatus('unpaired');
  }, []);

  // start / stop location reporting with the session
  useEffect(() => {
    if (status === 'paired' && token) {
      startLocationReporting(token);
      return () => {
        stopLocationReporting();
      };
    }
  }, [status, token]);

  return (
    <AuthContext.Provider value={{ status, patient, token, pair, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
