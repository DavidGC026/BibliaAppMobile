export type NotebookCoverId =
  | 'grad-purple'
  | 'grad-blue'
  | 'grad-ocean'
  | 'grad-emerald'
  | 'grad-gold'
  | 'grad-rose';

export const NOTEBOOK_PRESET_COVERS: {
  id: NotebookCoverId;
  label: string;
  colors: [string, string, string];
}[] = [
  { id: 'grad-purple', label: 'Púrpura Imperial', colors: ['#1e1b4b', '#581c87', '#9f1239'] },
  { id: 'grad-blue', label: 'Cielo Nocturno', colors: ['#020617', '#172554', '#312e81'] },
  { id: 'grad-ocean', label: 'Océano Profundo', colors: ['#172554', '#164e63', '#115e59'] },
  { id: 'grad-emerald', label: 'Bosque Místico', colors: ['#022c22', '#042f2e', '#064e3b'] },
  { id: 'grad-gold', label: 'Escritura Antigua', colors: ['#1c1917', '#451a03', '#78350f'] },
  { id: 'grad-rose', label: 'Gracia Divina', colors: ['#0c0a09', '#4c0519', '#831843'] },
];

export const NOTE_TAGS = [
  { id: 'fe', label: 'Fe', bgLight: '#FEF3C7', textLight: '#92400E', bgDark: '#422006', textDark: '#FDE68A' },
  { id: 'familia', label: 'Familia', bgLight: '#DBEAFE', textLight: '#1E40AF', bgDark: '#1e3a8a', textDark: '#BFDBFE' },
  { id: 'adoracion', label: 'Adoración', bgLight: '#F3E8FF', textLight: '#6B21A8', bgDark: '#581c87', textDark: '#E9D5FF' },
  { id: 'crecimiento', label: 'Crecimiento', bgLight: '#D1FAE5', textLight: '#047857', bgDark: '#064e3b', textDark: '#A7F3D0' },
] as const;

export function getPresetCover(id?: string | null) {
  return NOTEBOOK_PRESET_COVERS.find((c) => c.id === id) ?? NOTEBOOK_PRESET_COVERS[0];
}

export function isCustomCoverUrl(cover?: string | null) {
  if (!cover) return false;
  return !cover.startsWith('grad-');
}

export function isPresetCover(cover?: string | null): cover is NotebookCoverId {
  return !!cover && cover.startsWith('grad-');
}

export function resolveCoverForSave(presetId: string, customUrl: string) {
  const url = customUrl.trim();
  if (url) return url;
  return presetId;
}

export function parseNoteTags(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function noteTagStyle(tagId: string, isDark: boolean) {
  const tag = NOTE_TAGS.find((t) => t.id === tagId);
  if (!tag) return null;
  return {
    label: tag.label,
    backgroundColor: isDark ? tag.bgDark : tag.bgLight,
    color: isDark ? tag.textDark : tag.textLight,
  };
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripNotePreview(content: string, max = 100) {
  const looksHtml = /<[a-z][^>]*>/i.test(content);
  const plain = looksHtml
    ? htmlToPlainText(content)
    : content
        .replace(/!\[.*?\]\(.*?\)/g, '[imagen]')
        .replace(/\[.*?\]\(.*?\)/g, '[archivo]')
        .replace(/[#>*_\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

  if (plain.length <= max) return plain;
  return `${plain.substring(0, max).trim()}…`;
}
