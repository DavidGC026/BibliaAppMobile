import * as SecureStore from 'expo-secure-store';

const KEY = 'biblia_read_today';

export function todayLocalStr(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().split('T')[0];
}

export async function markReadToday(): Promise<void> {
  await SecureStore.setItemAsync(KEY, todayLocalStr());
}

export async function hasReadToday(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(KEY);
  return stored === todayLocalStr();
}
