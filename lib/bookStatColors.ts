export function getBookCategoryColor(bookId: number) {
  if (bookId >= 1 && bookId <= 5) return '#10b981';
  if (bookId >= 6 && bookId <= 17) return '#3b82f6';
  if (bookId >= 18 && bookId <= 22) return '#eab308';
  if (bookId >= 23 && bookId <= 39) return '#ef4444';
  if (bookId >= 40 && bookId <= 43) return '#8b5cf6';
  if (bookId === 44) return '#0ea5e9';
  if (bookId >= 45 && bookId <= 65) return '#ec4899';
  if (bookId === 66) return '#f97316';
  return '#cbd5e1';
}

export const BOOK_CATEGORY_LEGEND = [
  { label: 'Pentateuco', color: '#10b981' },
  { label: 'Históricos', color: '#3b82f6' },
  { label: 'Poéticos', color: '#eab308' },
  { label: 'Profetas', color: '#ef4444' },
  { label: 'Evangelios', color: '#8b5cf6' },
  { label: 'Hechos', color: '#0ea5e9' },
  { label: 'Epístolas', color: '#ec4899' },
  { label: 'Apocalipsis', color: '#f97316' },
] as const;
