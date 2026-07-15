import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NetworkProvider } from '@/context/NetworkContext';
import {
  isDarkTheme,
  ThemeProvider as AppThemeProvider,
  useThemeMode,
} from '@/context/ThemeContext';
import Colors from '@/constants/Colors';
import { loadAllDownloadedFonts } from '@/lib/fontManager';
import { hydrateOfflineDownloads } from '@/lib/offlineDownloadManager';
import { initOffline } from '@/lib/repo';
import { useAppReminders } from '@/hooks/useAppReminders';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      initOffline().catch(() => {});
      hydrateOfflineDownloads().catch((err) => console.error('Failed to hydrate offline downloads:', err));
      loadAllDownloadedFonts()
        .catch((err) => console.error('Failed to load user fonts on startup:', err))
        .finally(() => {
          SplashScreen.hideAsync();
        });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <NetworkProvider>
          <AuthProvider>
            <AdminThemeGuard>
              <RootLayoutNav />
            </AdminThemeGuard>
          </AuthProvider>
        </NetworkProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function AdminThemeGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    if (!isLoading && mode === 'dvg' && user?.role !== 'admin') {
      setMode('system');
    }
  }, [isLoading, mode, setMode, user?.role]);

  return children;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const usesDarkChrome = isDarkTheme(colorScheme);
  useAppReminders();

  const theme = usesDarkChrome
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: palette.primary,
          background: palette.background,
          card: palette.card,
          text: palette.text,
          border: palette.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: palette.primary,
          background: palette.background,
          card: palette.card,
          text: palette.text,
          border: palette.border,
        },
      };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={usesDarkChrome ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            title: 'Iniciar sesión',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: 'Restablecer contraseña',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="group/[id]"
          options={{
            title: 'Grupo',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="notebook/[id]"
          options={{
            title: 'Cuaderno',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="note/[noteId]"
          options={{
            title: 'Nota',
            headerShown: true,
          }}
        />
        <Stack.Screen name="devotional/[id]" options={{ title: 'Diario espiritual' }} />
        <Stack.Screen name="devotional/read/[id]" options={{ title: 'Devocional' }} />
        <Stack.Screen name="study-book/[id]" options={{ title: 'Libro de estudio' }} />
        <Stack.Screen
          name="events"
          options={{
            title: 'Calendario',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: 'Notificaciones',
          }}
        />
        <Stack.Screen name="activity" options={{ title: 'Actividad' }} />
        <Stack.Screen name="statistics" options={{ title: 'Estadísticas' }} />
        <Stack.Screen name="highlights" options={{ title: 'Subrayados' }} />
        <Stack.Screen name="favorites" options={{ title: 'Favoritos' }} />
        <Stack.Screen name="downloads" options={{ title: 'Descargas' }} />
        <Stack.Screen name="customize-home" options={{ title: 'Accesos rápidos' }} />
        <Stack.Screen name="search" options={{ title: 'Búsqueda' }} />
        <Stack.Screen name="rainbow" options={{ title: 'Mapa de referencias' }} />
      </Stack>
    </ThemeProvider>
  );
}
