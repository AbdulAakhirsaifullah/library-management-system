import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (credentials: { username: string; password: string }, staffOnly?: boolean) => Promise<User>;
  signUp: (input: { username: string; email: string; password: string }) => Promise<User>;
  applySession: (session: { token: string; user: User }) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

interface Session {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = useCallback((session: Session) => {
    tokenStore.set(session.token);
    setUser(session.user);
  }, []);

  const signIn = useCallback(
    async (credentials: { username: string; password: string }, staffOnly = false) => {
      const session = await api<Session>(staffOnly ? '/auth/admin/login' : '/auth/login', {
        method: 'POST',
        body: credentials,
      });
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const session = await api<Session>('/auth/signup', { method: 'POST', body: input });
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, applySession, signOut }),
    [user, loading, signIn, signUp, applySession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
