import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ResolvedScheme =
  | 'light'
  | 'dark'
  | 'sepia'
  | 'sepiaDark'
  | 'midnight'
  | 'forest'
  | 'lavender'
  | 'dvg';
export type ThemeMode = 'system' | ResolvedScheme;

const THEME_KEY = 'bibliaapp_theme_mode';
const MODES: ThemeMode[] = [
  'system',
  'light',
  'dark',
  'sepia',
  'sepiaDark',
  'midnight',
  'forest',
  'lavender',
  'dvg',
];

const DARK_SCHEMES: ReadonlySet<ResolvedScheme> = new Set([
  'dark',
  'sepiaDark',
  'midnight',
  'forest',
  'dvg',
]);

export function isDarkTheme(scheme: ResolvedScheme): boolean {
  return DARK_SCHEMES.has(scheme);
}

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  systemScheme: 'light' | 'dark';
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

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
  }, []);

  const systemScheme = system === 'dark' ? 'dark' : 'light';
  const scheme: ResolvedScheme = mode === 'system' ? systemScheme : mode;

  return (
    <ThemeContext.Provider value={{ mode, scheme, systemScheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback seguro si algún consumidor se monta fuera del provider.
    return { mode: 'system', scheme: 'light', systemScheme: 'light', setMode: () => {} };
  }
  return ctx;
}
