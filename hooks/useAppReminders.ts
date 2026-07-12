import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { syncLocalReminders } from '@/lib/localNotifications';
import { getOfflineDownloadSnapshot } from '@/lib/offlineDownloadManager';
import { getReminderPreferences } from '@/lib/reminderPreferences';
import { todayLocalStr } from '@/lib/readingToday';
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
    return;
  }
  if (data.type === 'devotional-reminder') {
    router.push('/devotional/new');
    return;
  }
  if (data.type === 'downloads-reminder') {
    router.push('/downloads');
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

    const run = async () => {
      const prefs = await getReminderPreferences();

      let hasDevotionalToday = true;
      if (!isGuest && prefs.devotionalReminder) {
        try {
          const { devotionals } = await api.listDevotionals();
          const today = todayLocalStr();
          hasDevotionalToday = devotionals.some((d) => (d.createdAt || '').slice(0, 10) === today);
        } catch {
          hasDevotionalToday = true;
        }
      }

      const hasIncompleteDownloads = getOfflineDownloadSnapshot().some((task) => task.status === 'error');

      syncLocalReminders({
        streakCount: user?.streakCount ?? 0,
        streakEnabled: !isGuest && prefs.streakReminder && (user?.streakCount ?? 0) > 0,
        devotionalReminderEnabled: !isGuest && prefs.devotionalReminder,
        hasDevotionalToday,
        downloadsReminderEnabled: prefs.downloadsReminder,
        hasIncompleteDownloads,
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
