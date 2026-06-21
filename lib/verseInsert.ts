import type { Verse } from './types';

export function formatVerseInsertion(
  verses: Pick<Verse, 'verse' | 'text'>[],
  bookName: string,
  chapter: number,
  bibleAbbr: string,
): string {
  if (verses.length === 0) return '';

  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const numbers = sorted.map((v) => v.verse);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const isRange = max - min === numbers.length - 1;
  const verseRefStr =
    isRange && numbers.length > 1 ? `${min}-${max}` : numbers.join(',');

  const reference = `${bookName} ${chapter}:${verseRefStr}`;
  const versesText = sorted.map((v) => `**${v.verse}** ${v.text}`).join(' ');

  return `\n> **${reference} (${bibleAbbr})**\n> ${versesText}\n\n`;
}

export type NoteBlock =
  | { type: 'text'; text: string }
  | { type: 'quote'; lines: string[] };

/** Parsea bloques de cita bíblica (> **ref**) y texto normal. */
export function parseNoteContent(content: string): NoteBlock[] {
  const lines = content.split('\n');
  const blocks: NoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push({ type: 'quote', lines: quoteLines });
      continue;
    }

    const textLines: string[] = [];
    while (i < lines.length && !lines[i].startsWith('> ')) {
      if (lines[i].trim() === '' && textLines.length === 0) {
        i += 1;
        break;
      }
      if (lines[i].trim() === '' && textLines.length > 0) {
        i += 1;
        break;
      }
      textLines.push(lines[i]);
      i += 1;
    }

    if (textLines.length > 0) {
      blocks.push({ type: 'text', text: textLines.join('\n') });
    }
  }

  return blocks;
}
