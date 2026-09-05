export type InterlinearLanguage = 'grc' | 'heb' | 'arc';
export type InterlinearPreference = 'auto' | 'heb' | 'grc';
export type ChapterStudyKind = 'interlinear' | 'commentaries';

export interface InterlinearWord {
  bookId: number;
  chapter: number;
  verse: number;
  position: number;
  original: string;
  transliteration: string | null;
  strongCode: string | null;
  morph: string | null;
  lemma: string | null;
  glossEs: string | null;
  glossEn: string | null;
  language: InterlinearLanguage;
  definition: string | null;
}

export interface Commentary {
  id: number;
  bibleId: number;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  author: string;
  languageCode: string;
  contentMd: string;
}

export type StudyContent = {
  interlinear: InterlinearWord[];
  commentaries: Commentary[];
};

export interface StudyPassage {
  bibleId: number;
  bookId: number;
  chapter: number;
}

export const STUDY_LABELS: Record<ChapterStudyKind, string> = {
  interlinear: 'Interlineal',
  commentaries: 'Comentarios',
};

export function studyBibleId(kind: ChapterStudyKind, bibleId: number): number {
  return kind === 'interlinear' ? 0 : bibleId;
}

export function interlinearApplies(preference: InterlinearPreference, bookId: number): boolean {
  return preference === 'auto' || preference === (bookId <= 39 ? 'heb' : 'grc');
}

export function interlinearLanguageLabel(words: InterlinearWord[]): string {
  if (words.some((word) => word.language === 'arc')) return 'Hebreo / arameo';
  return words.some((word) => word.language === 'heb') ? 'Hebreo' : 'Griego';
}

export function groupInterlinearWords(words: InterlinearWord[]): Map<number, InterlinearWord[]> {
  const grouped = new Map<number, InterlinearWord[]>();
  for (const word of words) {
    const group = grouped.get(word.verse) ?? [];
    group.push(word);
    grouped.set(word.verse, group);
  }
  for (const group of grouped.values()) group.sort((a, b) => a.position - b.position);
  return new Map([...grouped].sort(([a], [b]) => a - b));
}

export function commentariesForVerse(commentaries: Commentary[], verse: number | null): Commentary[] {
  return verse === null ? commentaries : commentaries.filter((item) => item.verseStart <= verse && item.verseEnd >= verse);
}

/** No guardar una respuesta malformada o de otro pasaje como descarga válida. */
export function validateStudyContent<K extends ChapterStudyKind>(
  kind: K, content: unknown, passage: StudyPassage,
): StudyContent[K] {
  if (!Array.isArray(content) || !content.every((item) => {
    if (!item || item.bookId !== passage.bookId || item.chapter !== passage.chapter) return false;
    if (kind === 'interlinear') {
      return Number.isInteger(item.verse) && item.verse >= 0 &&
        Number.isInteger(item.position) && item.position > 0 &&
        typeof item.original === 'string' && ['grc', 'heb', 'arc'].includes(item.language);
    }
    return Number.isInteger(item.id) && Number.isInteger(item.verseStart) &&
      Number.isInteger(item.verseEnd) && item.verseStart > 0 && item.verseEnd >= item.verseStart &&
      (item.bibleId === 0 || item.bibleId === passage.bibleId) &&
      typeof item.author === 'string' && typeof item.contentMd === 'string';
  })) throw new Error('La respuesta de estudio no corresponde a este capítulo.');
  return content as StudyContent[K];
}
