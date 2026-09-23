import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, getRefreshToken, setOnLogout, setTokens, type CaregiverUser } from './api';

type AuthCtx = {
  user: CaregiverUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CaregiverUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    const rt = getRefreshToken();
    if (rt) auth.logout(rt).catch(() => {});
    setTokens(null, null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnLogout(() => setUser(null));
  }, []);

  useEffect(() => {
    (async () => {
      const rt = getRefreshToken();
      if (!rt) return setLoading(false);
      // No access token yet — auth.me() 401s, the client refreshes with `rt`, retries.
      setTokens(null, rt);
      try {
        setUser(await auth.me());
      } catch {
        setTokens(null, null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token } = await auth.login(email, password);
    setTokens(access_token, refresh_token);
    setUser(await auth.me());
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const { access_token, refresh_token } = await auth.google(idToken);
    setTokens(access_token, refresh_token);
    setUser(await auth.me());
  }, []);

  return <Ctx.Provider value={{ user, loading, login, loginWithGoogle, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
