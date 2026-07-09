import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import { hasReadToday } from '@/lib/readingToday';
import { cacheVerseForWidget } from '@/lib/verseWidgetCache';
import { updateVerseWidget } from '@/lib/verseWidgetUpdate';

const DAILY_VERSE_ID = 'biblia-daily-verse';
const STREAK_ID = 'biblia-streak-reminder';

const VERSE_HOUR = 7;
const STREAK_HOUR = 20;

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

async function ensurePermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-verse', {
    name: 'Versículo del día',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync('streak-reminder', {
    name: 'Racha de lectura',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function scheduleDailyVerse(bibleId: number): Promise<void> {
  const verse = await api.getVerseOfDay(bibleId);
  await cacheVerseForWidget(verse);
  await updateVerseWidget(verse);

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_VERSE_ID,
    content: {
      title: `Versículo del día — ${verse.reference}`,
      body: truncate(verse.text, 200),
      data: {
        type: 'verse-of-day',
        bookId: verse.idBook,
        chapter: verse.chapter,
        bibleId: verse.idBible,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: VERSE_HOUR,
      minute: 0,
      channelId: 'daily-verse',
    },
  });
}

async function scheduleStreakReminder(streakCount: number): Promise<void> {
  if (streakCount <= 0) {
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
    return;
  }
  if (await hasReadToday()) {
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
    return;
  }

  const now = new Date();
  const fireAt = new Date();
  fireAt.setHours(STREAK_HOUR, 0, 0, 0);
  if (fireAt <= now) {
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
    return;
  }

  const daysLabel = streakCount === 1 ? '1 día' : `${streakCount} días`;
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_ID,
    content: {
      title: '¡No pierdas tu racha!',
      body: `Llevas ${daysLabel} seguidos. Lee la Biblia hoy para continuar.`,
      data: { type: 'streak-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'streak-reminder',
    },
  });
}

/** Reprograma versículo diario (7:00) y recordatorio de racha (20:00). */
export async function syncLocalReminders(options: {
  bibleId?: number;
  streakCount?: number;
  streakEnabled?: boolean;
}): Promise<void> {
  if (!(await ensurePermissions())) return;
  await ensureAndroidChannels();

  const bibleId = options.bibleId ?? DEFAULT_BIBLE_ID;
  try {
    await scheduleDailyVerse(bibleId);
  } catch {
    // Sin red: el widget usará caché
  }

  if (options.streakEnabled && options.streakCount != null) {
    await scheduleStreakReminder(options.streakCount);
  } else {
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
  }
}

export async function cancelStreakReminderForToday(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
}
