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
