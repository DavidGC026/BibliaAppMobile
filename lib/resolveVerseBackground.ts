import { API_BASE_URL } from '@/lib/config';
import { daySeedFromDate, pickDailyImage, themeToUnsplashQuery } from '@/lib/verseThemeUnsplash';
import type { VerseOfDay } from '@/lib/types';

async function fetchUnsplashUrl(
  theme: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<string | null> {
  const query = themeToUnsplashQuery(theme);
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/unsplash?query=${encodeURIComponent(query)}&orientation=${orientation}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: { url: string }[] };
    return pickDailyImage(data.images ?? [], daySeedFromDate())?.url ?? null;
  } catch {
    return null;
  }
}

export async function resolveVerseBackgroundImage(
  verse: Pick<VerseOfDay, 'theme' | 'backgroundImage'>,
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<string | null> {
  if (verse.backgroundImage?.trim()) return verse.backgroundImage.trim();
  if (!verse.theme?.trim()) return null;
  return fetchUnsplashUrl(verse.theme, orientation);
}
