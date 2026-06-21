import { API_BASE_URL } from './config';

/** Convierte rutas relativas del backend en URL absolutas. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  // Web external-books stores covers as base64 data URLs in DB.
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/${trimmed}`;
}

export function needsAuthHeaders(url: string): boolean {
  return url.includes('/api/media/') || url.includes('/api/uploads/');
}

export type FeedBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'file'; url: string; label: string };

/** Parsea párrafos del feed (texto, ![img](url), [📄 file](url)). */
export function parseFeedContent(content: string): FeedBlock[] {
  return content.split('\n\n').map((paragraph) => {
    const imgMatch = paragraph.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return { type: 'image', alt: imgMatch[1], url: imgMatch[2] };
    }
    const linkMatch = paragraph.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return { type: 'file', label: linkMatch[1], url: linkMatch[2] };
    }
    return { type: 'text', text: paragraph };
  });
}
