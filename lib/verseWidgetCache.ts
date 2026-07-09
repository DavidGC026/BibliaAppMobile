import {
  cacheDirectory,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

import { resolveVerseBackgroundImage } from '@/lib/resolveVerseBackground';
import { todayLocalStr } from '@/lib/readingToday';
import type { VerseOfDay } from '@/lib/types';

const META_PATH = `${documentDirectory ?? ''}widget-verse-meta.json`;
const BG_PATH = `${cacheDirectory ?? ''}widget-verse-bg.jpg`;

export type CachedVerse = VerseOfDay & {
  cachedDate: string;
  localBackgroundPath?: string | null;
};

async function fileExists(path: string): Promise<boolean> {
  if (!path) return false;
  const info = await getInfoAsync(path);
  return info.exists;
}

/** Descarga la imagen de fondo a disco para que el widget nativo la lea con file:// */
export async function downloadWidgetBackground(remoteUrl: string): Promise<string | null> {
  const url = remoteUrl.trim();
  if (!url.startsWith('http')) return null;
  try {
    const { status, uri } = await downloadAsync(url, BG_PATH);
    return status === 200 ? uri : null;
  } catch {
    return null;
  }
}

export async function getWidgetBackgroundUri(): Promise<string | null> {
  return (await fileExists(BG_PATH)) ? BG_PATH : null;
}

async function ensureLocalBackground(verse: VerseOfDay): Promise<string | null> {
  const remote =
    verse.backgroundImage?.trim() || (verse.theme ? await resolveVerseBackgroundImage(verse, 'landscape') : null);
  if (!remote) return getWidgetBackgroundUri();
  return downloadWidgetBackground(remote);
}

export async function cacheVerseForWidget(verse: VerseOfDay): Promise<CachedVerse> {
  const localBackgroundPath = await ensureLocalBackground(verse);
  const payload: CachedVerse = {
    ...verse,
    cachedDate: todayLocalStr(),
    localBackgroundPath,
  };
  await writeAsStringAsync(META_PATH, JSON.stringify(payload));
  return payload;
}

export async function getCachedVerseForWidget(): Promise<CachedVerse | null> {
  try {
    if (!(await fileExists(META_PATH))) return null;
    const raw = await readAsStringAsync(META_PATH);
    const cached = JSON.parse(raw) as CachedVerse;
    if (!(await fileExists(BG_PATH))) {
      cached.localBackgroundPath = null;
    } else {
      cached.localBackgroundPath = BG_PATH;
    }
    return cached;
  } catch {
    return null;
  }
}

/**
 * URI de imagen lista para ImageWidget.
 * ImageWidget solo soporta http:/https:/data:image – NO soporta file://.
 * Leemos el archivo local (nombre fijo, se sobreescribe diario) como base64
 * para generar un data URI compatible con el widget.
 * Si no hay archivo local, devolvemos la URL remota como fallback.
 */
export async function resolveWidgetImageUri(verse: VerseOfDay): Promise<string | null> {
  // 1. Intentar leer la imagen local como base64
  if (await fileExists(BG_PATH)) {
    try {
      const base64 = await readAsStringAsync(BG_PATH, { encoding: 'base64' });
      if (base64) return `data:image/jpeg;base64,${base64}`;
    } catch {
      // Si falla la lectura, intentamos con la URL remota
    }
  }

  // 2. Fallback: URL remota directa (http/https)
  const remote =
    verse.backgroundImage?.trim() || (verse.theme ? await resolveVerseBackgroundImage(verse, 'landscape') : null);
  return remote ?? null;
}

