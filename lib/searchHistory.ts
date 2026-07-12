import * as SecureStore from 'expo-secure-store';

const SEARCH_HISTORY_KEY = 'BIBLIA_SEARCH_HISTORY';
const MAX_HISTORY = 10;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export async function addSearchHistoryEntry(query: string): Promise<string[]> {
  const clean = query.trim();
  if (clean.length < 2) return getSearchHistory();

  const current = await getSearchHistory();
  const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_HISTORY);
  await SecureStore.setItemAsync(SEARCH_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function removeSearchHistoryEntry(query: string): Promise<string[]> {
  const current = await getSearchHistory();
  const next = current.filter((item) => item.toLowerCase() !== query.toLowerCase());
  await SecureStore.setItemAsync(SEARCH_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await SecureStore.deleteItemAsync(SEARCH_HISTORY_KEY);
}
