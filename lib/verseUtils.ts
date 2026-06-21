import { API_BASE_URL } from '@/lib/config';
import { buildBiblePassageUrl } from '@/lib/bibleUrl';
import type { Verse } from '@/lib/types';

/** Formatea [1,2,3,5] como "1-3,5" */
export function formatVerseRange(versesList: number[]): string {
  if (versesList.length === 0) return '';
  const sorted = [...versesList].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(',');
}

export function buildSelectionShareText(options: {
  selectedVerses: number[];
  verses: Verse[];
  bookName: string;
  bookId: number;
  chapter: number;
  bibleId: number;
  bibleAbbr: string;
}): { text: string; title: string; url: string } | null {
  const { selectedVerses, verses, bookName, bookId, chapter, bibleId, bibleAbbr } = options;
  const selectedVersesData = verses
    .filter((v) => selectedVerses.includes(v.verse))
    .sort((a, b) => a.verse - b.verse);
  if (selectedVersesData.length === 0) return null;

  const verseRangeStr = formatVerseRange(selectedVerses);
  const titleLine = `${bookName} ${chapter}:${verseRangeStr}:`;
  const bodyLines = selectedVersesData.map((v) => `${v.verse}. ${v.text}`).join('\n\n');
  const url = buildBiblePassageUrl({
    origin: API_BASE_URL,
    bibleId,
    bookId,
    chapter,
    verseRange: verseRangeStr,
    bibleAbbr,
  });
  const footerLine = `${bookName.toUpperCase()} ${chapter}:${verseRangeStr}\n${url}`;

  return {
    text: `${titleLine}\n\n${bodyLines}\n\n${footerLine}`,
    title: `${bookName} ${chapter}:${verseRangeStr}`,
    url,
  };
}

export function buildImageCreatorData(options: {
  selectedVerses: number[];
  verses: Verse[];
  bookName: string;
  chapter: number;
  bibleAbbr: string;
}): { text: string; reference: string; abbr: string } | null {
  const selectedVersesData = options.verses
    .filter((v) => options.selectedVerses.includes(v.verse))
    .sort((a, b) => a.verse - b.verse);
  if (selectedVersesData.length === 0) return null;

  const verseRangeStr = formatVerseRange(options.selectedVerses);
  return {
    text: selectedVersesData.map((v) => v.text).join(' '),
    reference: `${options.bookName} ${options.chapter}:${verseRangeStr}`,
    abbr: options.bibleAbbr,
  };
}
