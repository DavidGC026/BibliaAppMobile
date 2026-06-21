import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark' | 'sepia';
export type ResolvedScheme = 'light' | 'dark' | 'sepia';

const THEME_KEY = 'bibliaapp_theme_mode';
const MODES: ThemeMode[] = ['system', 'light', 'dark', 'sepia'];

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((value) => {
        if (value && (MODES as string[]).includes(value)) {
          setModeState(value as ThemeMode);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
  };

  const scheme: ResolvedScheme =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeContext.Provider value={{ mode, scheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback seguro si algún consumidor se monta fuera del provider.
    return { mode: 'system', scheme: 'light', setMode: () => {} };
  }
  return ctx;
}
