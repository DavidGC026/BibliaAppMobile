import * as SecureStore from 'expo-secure-store';

const READER_PREFS_KEY = 'BIBLIA_READER_PREFERENCES';
const LAST_PASSAGE_KEY = 'BIBLIA_LAST_PASSAGE';

export type ReaderDensity = 'relaxed' | 'compact';
export type ReaderAlign = 'left' | 'justify';

export type ReaderPreferences = {
  fontSize: number;
  density: ReaderDensity;
  align: ReaderAlign;
};

export type LastPassage = {
  bibleId: number;
  bibleAbbr: string;
  bookId: number;
  bookName: string;
  chapter: number;
  updatedAt: string;
};

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 19,
  density: 'relaxed',
  align: 'left',
};

export async function getReaderPreferences(): Promise<ReaderPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(READER_PREFS_KEY);
    if (!raw) return DEFAULT_READER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;
    return {
      fontSize: clampFontSize(parsed.fontSize),
      density: parsed.density === 'compact' ? 'compact' : 'relaxed',
      align: parsed.align === 'justify' ? 'justify' : 'left',
    };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export async function saveReaderPreferences(preferences: ReaderPreferences) {
  await SecureStore.setItemAsync(
    READER_PREFS_KEY,
    JSON.stringify({
      fontSize: clampFontSize(preferences.fontSize),
      density: preferences.density,
      align: preferences.align,
    }),
  );
}

export async function getLastPassage(): Promise<LastPassage | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_PASSAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastPassage;
    if (!parsed.bibleId || !parsed.bookId || !parsed.chapter || !parsed.bookName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLastPassage(passage: Omit<LastPassage, 'updatedAt'>) {
  await SecureStore.setItemAsync(
    LAST_PASSAGE_KEY,
    JSON.stringify({ ...passage, updatedAt: new Date().toISOString() } satisfies LastPassage),
  );
}

function clampFontSize(value: unknown) {
  const parsed = typeof value === 'number' ? value : DEFAULT_READER_PREFERENCES.fontSize;
  return Math.min(24, Math.max(16, parsed));
}
