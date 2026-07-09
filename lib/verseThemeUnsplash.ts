export const THEME_UNSPLASH_QUERIES: Record<string, string> = {
  Amor: 'love sunset romantic nature',
  Fe: 'faith light rays cross sky',
  Fortaleza: 'mountain peak strength landscape',
  Ansiedad: 'calm peaceful forest mist',
  Esperanza: 'sunrise horizon hope sky',
  Paz: 'calm lake peaceful water',
  Consuelo: 'soft light meadow comfort',
  Promesa: 'rainbow sky horizon landscape',
};

export function themeToUnsplashQuery(theme: string): string {
  const trimmed = theme?.trim();
  if (!trimmed) return 'nature landscape spiritual';
  return THEME_UNSPLASH_QUERIES[trimmed] ?? `${trimmed} nature spiritual landscape`;
}

export function pickDailyImage<T>(items: T[], daySeed: number): T | null {
  if (!items.length) return null;
  return items[Math.abs(daySeed) % items.length];
}

export function daySeedFromDate(d = new Date()): number {
  return (d.getMonth() + 1) * 31 + d.getDate();
}
