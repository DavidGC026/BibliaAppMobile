import * as SecureStore from 'expo-secure-store';

const REMINDER_PREFS_KEY = 'BIBLIA_REMINDER_PREFERENCES';

export type ReminderPreferences = {
  streakReminder: boolean;
  devotionalReminder: boolean;
  downloadsReminder: boolean;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  streakReminder: true,
  devotionalReminder: true,
  downloadsReminder: true,
};

export async function getReminderPreferences(): Promise<ReminderPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(REMINDER_PREFS_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ReminderPreferences>;
    return {
      streakReminder: parsed.streakReminder !== false,
      devotionalReminder: parsed.devotionalReminder !== false,
      downloadsReminder: parsed.downloadsReminder !== false,
    };
  } catch {
    return DEFAULT_REMINDER_PREFERENCES;
  }
}

export async function saveReminderPreferences(preferences: ReminderPreferences): Promise<void> {
  await SecureStore.setItemAsync(REMINDER_PREFS_KEY, JSON.stringify(preferences));
}
