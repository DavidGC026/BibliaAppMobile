import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import * as api from '@/lib/api';
import { signInWithGoogle } from '@/lib/googleAuth';
import { setOpenMediaTokenGetter } from '@/lib/openMedia';
import { createSessionController } from '@/lib/sessionController';
import { revokeServerSession } from '@/lib/sessionLogout';
import type { User } from '@/lib/types';
import { clearPushTokenFromServer, syncPushTokenWithServer } from '@/hooks/usePushNotifications';
import { syncAll } from '@/lib/sync';

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
  const controller = useMemo(() => createSessionController(SecureStore, api.getMe), []);
  const [{ user, token }, setSession] = useState(controller.getSnapshot);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = controller.subscribe(setSession);
    api.setApiTokenGetter(() => controller.getSnapshot().token);
    setOpenMediaTokenGetter(() => controller.getSnapshot().token);
    controller.bootstrap().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe();
      controller.cancelPending();
    };
  }, [controller]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') controller.refresh().catch(() => {});
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') controller.refresh().catch(() => {});
    }, 5 * 60 * 1000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [controller]);

  useEffect(() => {
    if (!user?.id) return;
    syncPushTokenWithServer().catch(() => {});
    syncAll().catch(() => {});
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    await controller.signIn(() => api.login(email.trim().toLowerCase(), password));
  }, [controller]);

  const loginWithGoogle = useCallback(async () => {
    await controller.signIn(async () => ({ token: await signInWithGoogle() }));
  }, [controller]);

  const logout = useCallback(async () => {
    const sessionToken = controller.getSnapshot().token;
    // Capturar la credencial saliente: una petición lenta no debe usar el siguiente login.
    if (sessionToken) {
      revokeServerSession(sessionToken, clearPushTokenFromServer, api.logout).catch(() => {});
    }
    await controller.clear();
  }, [controller]);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, isLoading, isGuest: !isLoading && !user,
    login, loginWithGoogle, logout, refreshUser: controller.refresh,
  }), [user, token, isLoading, login, loginWithGoogle, logout, controller]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
