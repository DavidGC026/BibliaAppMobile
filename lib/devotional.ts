import type { Devotional, DevotionalContent } from '@/lib/types';

export const DEVOTIONAL_EMOTIONS = [
  { name: 'Agradecido', emoji: '🙏' },
  { name: 'Alegre', emoji: '😊' },
  { name: 'Cansado', emoji: '🥱' },
  { name: 'Triste', emoji: '😢' },
  { name: 'Ansioso', emoji: '😰' },
  { name: 'Confiado', emoji: '🛡️' },
] as const;

export function parseDevotionalContent(dev: Devotional): DevotionalContent {
  if (!dev.content) return { reflection: '', application: '' };
  if (typeof dev.content === 'string') {
    try {
      return JSON.parse(dev.content) as DevotionalContent;
    } catch {
      return { reflection: dev.content, application: '' };
    }
  }
  return dev.content;
}

export function formatDevotionalDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Entrada más reciente para la tarjeta de inicio. */
export function pickFeaturedDevotional(devotionals: Devotional[]): Devotional | null {
  if (!devotionals.length) return null;
  return [...devotionals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

export function emotionStyle(
  name: string,
  colors: { primary: string; primarySoft: string },
): { name: string; emoji: string; bg: string; border: string; text: string } | null {
  const e = DEVOTIONAL_EMOTIONS.find((x) => x.name === name);
  if (!e) return null;
  const palette: Record<string, { bg: string; border: string; text: string }> = {
    Agradecido: { bg: '#10B98118', border: '#10B98140', text: '#047857' },
    Alegre: { bg: '#F59E0B18', border: '#F59E0B40', text: '#B45309' },
    Cansado: { bg: '#3B82F618', border: '#3B82F640', text: '#1D4ED8' },
    Triste: { bg: '#6366F118', border: '#6366F140', text: '#4338CA' },
    Ansioso: { bg: '#F43F5E18', border: '#F43F5E40', text: '#BE123C' },
    Confiado: { bg: colors.primarySoft, border: `${colors.primary}40`, text: colors.primary },
  };
  const p = palette[e.name] ?? palette.Confiado;
  return { ...e, ...p };
}
