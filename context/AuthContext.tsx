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
import { isAuthError } from '@/lib/authError';
import { signInWithGoogle } from '@/lib/googleAuth';
import { setOpenMediaTokenGetter } from '@/lib/openMedia';
import type { User } from '@/lib/types';
import { clearPushTokenFromServer, syncPushTokenWithServer } from '@/hooks/usePushNotifications';
import { syncAll } from '@/lib/sync';

const TOKEN_KEY = 'bibliaapp_session';
const USER_KEY = 'bibliaapp_user';

async function persistUser(user: User | null) {
  if (user) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}

async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
      await persistUser(nextUser);
      if (!nextUser) {
        setToken(null);
        await clearSession();
      }
    } catch (err) {
      // Solo cerrar sesión si el servidor dice que el token ya no vale.
      // Offline o errores transitorios: conservar la sesión cacheada.
      if (isAuthError(err)) {
        setUser(null);
        setToken(null);
        await clearSession();
      }
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
        const [stored, cachedUserRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (cancelled || !stored) return;

        // Restaurar sesión de forma optimista (funciona offline).
        setToken(stored);
        api.setApiTokenGetter(() => stored);
        setOpenMediaTokenGetter(() => stored);
        if (cachedUserRaw) {
          try {
            setUser(JSON.parse(cachedUserRaw) as User);
          } catch {
            // cache corrupto: se revalida abajo
          }
        }

        // Revalidar contra el servidor; conservar sesión si solo falla la red.
        try {
          const { user: nextUser } = await api.getMe();
          if (cancelled) return;
          if (nextUser) {
            setUser(nextUser);
            await persistUser(nextUser);
            syncPushTokenWithServer().catch(() => {});
            syncAll().catch(() => {});
          } else {
            setUser(null);
            setToken(null);
            await clearSession();
          }
        } catch (err) {
          if (!cancelled && isAuthError(err)) {
            setUser(null);
            setToken(null);
            await clearSession();
          }
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

  const applySession = useCallback(async (sessionToken: string, initialUser?: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, sessionToken);
    setToken(sessionToken);
    api.setApiTokenGetter(() => sessionToken);
    setOpenMediaTokenGetter(() => sessionToken);

    if (initialUser) {
      setUser(initialUser);
      await persistUser(initialUser);
    } else {
      const { user: nextUser } = await api.getMe();
      if (!nextUser) {
        throw new Error('No se pudo cargar tu perfil.');
      }
      setUser(nextUser);
      await persistUser(nextUser);
    }

    syncPushTokenWithServer().catch(() => {});
    syncAll().catch(() => {});
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email.trim().toLowerCase(), password);
    await applySession(result.token, result.user as User);
  }, [applySession]);

  const loginWithGoogle = useCallback(async () => {
    const sessionToken = await signInWithGoogle();
    await applySession(sessionToken);
  }, [applySession]);

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
    await clearSession();
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
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, loginWithGoogle, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
