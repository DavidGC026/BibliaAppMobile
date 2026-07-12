import * as SecureStore from 'expo-secure-store';

const READER_PREFS_KEY = 'BIBLIA_READER_PREFERENCES';
const LAST_PASSAGE_KEY = 'BIBLIA_LAST_PASSAGE';

export type ReaderDensity = 'relaxed' | 'compact';
export type ReaderAlign = 'left' | 'justify';
export type ReaderTheme = 'auto' | 'light' | 'sepia' | 'night' | 'contrast';

export type ReaderPreferences = {
  fontSize: number;
  density: ReaderDensity;
  align: ReaderAlign;
  theme: ReaderTheme;
};

export type ReaderThemePalette = {
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
  dark: boolean;
};

/** Paletas propias del lector; `auto` usa los colores del tema global de la app. */
export const READER_THEME_PALETTES: Record<Exclude<ReaderTheme, 'auto'>, ReaderThemePalette> = {
  light: {
    background: '#FFFFFF', text: '#1F2937', muted: '#6B7280',
    card: '#F3F4F6', border: '#E5E7EB',
    accent: '#92700C', accentSoft: '#FEF3C7', dark: false,
  },
  sepia: {
    background: '#F5ECD9', text: '#433422', muted: '#8A7256',
    card: '#EDE0C4', border: '#DCCBA4',
    accent: '#8A5A2B', accentSoft: '#EAD7B3', dark: false,
  },
  night: {
    background: '#0B1220', text: '#E5E7EB', muted: '#94A3B8',
    card: '#111C30', border: '#1E293B',
    accent: '#E8B84A', accentSoft: '#332A11', dark: true,
  },
  contrast: {
    background: '#000000', text: '#FFFFFF', muted: '#D1D5DB',
    card: '#111111', border: '#4B5563',
    accent: '#FFD866', accentSoft: '#2B2200', dark: true,
  },
};

export const READER_THEME_OPTIONS: { key: ReaderTheme; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'light', label: 'Claro' },
  { key: 'sepia', label: 'Sepia' },
  { key: 'night', label: 'Noche' },
  { key: 'contrast', label: 'Contraste' },
];

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
  theme: 'auto',
};

function parseReaderTheme(value: unknown): ReaderTheme {
  return value === 'light' || value === 'sepia' || value === 'night' || value === 'contrast' ? value : 'auto';
}

export async function getReaderPreferences(): Promise<ReaderPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(READER_PREFS_KEY);
    if (!raw) return DEFAULT_READER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ReaderPreferences>;
    return {
      fontSize: clampFontSize(parsed.fontSize),
      density: parsed.density === 'compact' ? 'compact' : 'relaxed',
      align: parsed.align === 'justify' ? 'justify' : 'left',
      theme: parseReaderTheme(parsed.theme),
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
      theme: preferences.theme,
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
