import { parseCommentaryBlocks, parseCommentaryInline } from './commentaryText';
import type { Commentary, InterlinearWord } from './study';

/** Las barras de STEPBible separan morfemas; no forman parte de la palabra. */
export function readableOriginal(original: string): string {
  return original.replace(/\//g, '');
}

export function studyVerseLabel(verse: number): string {
  return verse === 0 ? 'Título del salmo' : `Versículo ${verse}`;
}

export function studyVerseReference(reference: string, verse: number): string {
  return verse === 0 ? `${reference} · Título` : `${reference}:${verse}`;
}

export function studyVerseNumbers(verses: number[], words: InterlinearWord[], initialVerse: number | null): number[] {
  const available = [...verses, ...words.map((word) => word.verse)];
  if (initialVerse !== null) available.push(initialVerse);
  return [...new Set(available)].sort((first, second) => first - second);
}

export function commentaryRangeLabel(commentary: Commentary, chapterVerses: number[]): string {
  const numbered = chapterVerses.filter((verse) => verse > 0);
  const coversChapter = numbered.length > 0 && commentary.verseStart <= Math.min(...numbered)
    && commentary.verseEnd >= Math.max(...numbered);
  if (coversChapter) return 'Todo el capítulo';
  return commentary.verseStart === commentary.verseEnd
    ? `Versículo ${commentary.verseStart}`
    : `Versículos ${commentary.verseStart}–${commentary.verseEnd}`;
}

export function commentaryPreview(markdown: string): string {
  const blocks = parseCommentaryBlocks(markdown);
  const first = blocks.find((block) => block.kind === 'paragraph') ?? blocks[0];
  if (!first) return '';
  return parseCommentaryInline(first.text).map((span) => span.text).join('').replace(/\s+/g, ' ').trim();
}
