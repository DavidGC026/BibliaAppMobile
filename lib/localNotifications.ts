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
const DEVOTIONAL_ID = 'biblia-devotional-reminder';
const DOWNLOADS_ID = 'biblia-downloads-reminder';

const VERSE_HOUR = 7;
const STREAK_HOUR = 20;
const DEVOTIONAL_HOUR = 21;
const DOWNLOADS_HOUR = 12;

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
  await Notifications.setNotificationChannelAsync('devotional-reminder', {
    name: 'Devocional pendiente',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync('downloads-reminder', {
    name: 'Descargas incompletas',
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

async function scheduleDevotionalReminder(hasDevotionalToday: boolean): Promise<void> {
  if (hasDevotionalToday) {
    await Notifications.cancelScheduledNotificationAsync(DEVOTIONAL_ID);
    return;
  }

  const now = new Date();
  const fireAt = new Date();
  fireAt.setHours(DEVOTIONAL_HOUR, 0, 0, 0);
  if (fireAt <= now) {
    await Notifications.cancelScheduledNotificationAsync(DEVOTIONAL_ID);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DEVOTIONAL_ID,
    content: {
      title: 'Tu devocional de hoy',
      body: 'Aún no has escrito en tu diario espiritual hoy. Tómate un momento para reflexionar.',
      data: { type: 'devotional-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'devotional-reminder',
    },
  });
}

async function scheduleDownloadsReminder(hasIncompleteDownloads: boolean): Promise<void> {
  if (!hasIncompleteDownloads) {
    await Notifications.cancelScheduledNotificationAsync(DOWNLOADS_ID);
    return;
  }

  const now = new Date();
  const fireAt = new Date();
  fireAt.setHours(DOWNLOADS_HOUR, 0, 0, 0);
  if (fireAt <= now) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DOWNLOADS_ID,
    content: {
      title: 'Descargas pendientes',
      body: 'Tienes descargas offline sin completar. Ábrelas para reintentarlas.',
      data: { type: 'downloads-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'downloads-reminder',
    },
  });
}

/**
 * Reprograma los recordatorios locales: versículo diario (7:00), racha (20:00),
 * devocional pendiente (21:00) y descargas incompletas (12:00 del día siguiente si ya pasó la hora).
 */
export async function syncLocalReminders(options: {
  bibleId?: number;
  streakCount?: number;
  streakEnabled?: boolean;
  devotionalReminderEnabled?: boolean;
  hasDevotionalToday?: boolean;
  downloadsReminderEnabled?: boolean;
  hasIncompleteDownloads?: boolean;
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

  if (options.devotionalReminderEnabled) {
    await scheduleDevotionalReminder(Boolean(options.hasDevotionalToday));
  } else {
    await Notifications.cancelScheduledNotificationAsync(DEVOTIONAL_ID);
  }

  if (options.downloadsReminderEnabled) {
    await scheduleDownloadsReminder(Boolean(options.hasIncompleteDownloads));
  } else {
    await Notifications.cancelScheduledNotificationAsync(DOWNLOADS_ID);
  }
}

export async function cancelStreakReminderForToday(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
}
