import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { syncLocalReminders } from '@/lib/localNotifications';
import { DEFAULT_BIBLE_ID } from '@/lib/config';

function handleNotificationNavigation(data: Record<string, unknown> | undefined) {
  if (!data?.type) return;
  if (data.type === 'verse-of-day') {
    router.push({
      pathname: '/(tabs)/bible',
      params: {
        bookId: String(data.bookId ?? ''),
        chapter: String(data.chapter ?? ''),
        bibleId: String(data.bibleId ?? DEFAULT_BIBLE_ID),
      },
    });
    return;
  }
  if (data.type === 'streak-reminder') {
    router.push('/(tabs)/bible');
  }
}

export function useAppReminders() {
  const { user, isGuest, isLoading } = useAuth();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationNavigation(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const run = () => {
      syncLocalReminders({
        streakCount: user?.streakCount ?? 0,
        streakEnabled: !isGuest && (user?.streakCount ?? 0) > 0,
      }).catch(() => {});
    };

    run();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [isLoading, isGuest, user?.streakCount, user?.id]);
}

/** Solo Android: info para el perfil */
export function androidWidgetAvailable(): boolean {
  return Platform.OS === 'android';
}
