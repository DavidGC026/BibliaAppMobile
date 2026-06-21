import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as api from '@/lib/api';
import { setOpenMediaTokenGetter } from '@/lib/openMedia';
import type { User } from '@/lib/types';
import { clearPushTokenFromServer, syncPushTokenWithServer } from '@/hooks/usePushNotifications';

const TOKEN_KEY = 'bibliaapp_session';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user: nextUser } = await api.getMe();
      setUser(nextUser);
    } catch {
      setUser(null);
      setToken(null);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  }, []);

  useEffect(() => {
    api.setApiTokenGetter(() => token);
    setOpenMediaTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (cancelled) return;

        if (stored) {
          setToken(stored);
          api.setApiTokenGetter(() => stored);
          setOpenMediaTokenGetter(() => stored);
          const { user: nextUser } = await api.getMe();
          if (!cancelled) {
            setUser(nextUser);
            if (nextUser) syncPushTokenWithServer().catch(() => {});
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setToken(null);
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email.trim().toLowerCase(), password);
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    setToken(result.token);
    api.setApiTokenGetter(() => result.token);
    setOpenMediaTokenGetter(() => result.token);
    setUser(result.user as User);
    await refreshUser();
    syncPushTokenWithServer().catch(() => {});
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await clearPushTokenFromServer();
    } catch {
      // Ignorar
    }
    try {
      await api.logout();
    } catch {
      // Ignorar errores de red al cerrar sesión
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isGuest: !isLoading && !user,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
