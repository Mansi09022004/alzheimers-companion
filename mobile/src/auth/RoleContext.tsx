/**
 * Which side of the app this device is set up for — asked once on first launch,
 * remembered after that. "Patient" continues into the existing pairing/home
 * flow; "Caregiver" opens the caregiver web dashboard.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { tokenStore } from '../storage';

const ROLE_KEY = 'device_role';

export type Role = 'patient' | 'caregiver';

type RoleState = {
  role: Role | null;
  loading: boolean;
  setRole: (role: Role) => Promise<void>;
  clearRole: () => Promise<void>;
};

const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await tokenStore.get(ROLE_KEY);
      if (saved === 'patient' || saved === 'caregiver') setRoleState(saved);
      setLoading(false);
    })();
  }, []);

  const setRole = useCallback(async (next: Role) => {
    await tokenStore.set(ROLE_KEY, next);
    setRoleState(next);
  }, []);

  const clearRole = useCallback(async () => {
    await tokenStore.remove(ROLE_KEY);
    setRoleState(null);
  }, []);

  return (
    <RoleContext.Provider value={{ role, loading, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>');
  return ctx;
}
