import { getAll, getFirst, nowIso, run } from '@/lib/db';
import { studyBibleId, validateStudyContent, type ChapterStudyKind, type StudyContent, type StudyPassage } from '@/lib/study';

export type CachedStudyChapter<K extends ChapterStudyKind> = { content: StudyContent[K]; savedAt: string };

function chapterParams(kind: ChapterStudyKind, passage: StudyPassage) {
  return [kind, studyBibleId(kind, passage.bibleId), passage.bookId, passage.chapter];
}

export async function readStudyChapter<K extends ChapterStudyKind>(
  kind: K, passage: StudyPassage,
): Promise<CachedStudyChapter<K> | null> {
  const row = await getFirst<{ content_json: string; saved_at: string }>(
    'SELECT content_json, saved_at FROM study_chapters WHERE kind = ? AND bible_id = ? AND book_id = ? AND chapter = ?',
    chapterParams(kind, passage),
  );
  if (!row) return null;
  try {
    return { content: validateStudyContent(kind, JSON.parse(row.content_json), passage), savedAt: row.saved_at };
  } catch {
    return null;
  }
}

export async function saveStudyChapter<K extends ChapterStudyKind>(
  kind: K, passage: StudyPassage, content: StudyContent[K],
): Promise<void> {
  validateStudyContent(kind, content, passage);
  await run(
    `INSERT OR REPLACE INTO study_chapters
     (kind, bible_id, book_id, chapter, content_json, item_count, saved_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [...chapterParams(kind, passage), JSON.stringify(content), content.length, nowIso()],
  );
}

export interface StudyBookCache {
  kind: ChapterStudyKind;
  bibleId: number;
  bookId: number;
  chapters: number;
  items: number;
}

export async function listStudyBookCaches(): Promise<StudyBookCache[]> {
  return getAll<StudyBookCache>(
    `SELECT kind, bible_id AS bibleId, book_id AS bookId, COUNT(*) AS chapters, SUM(item_count) AS items
     FROM study_chapters GROUP BY kind, bible_id, book_id ORDER BY kind, book_id`,
  );
}

export async function deleteStudyBook(kind: ChapterStudyKind, bibleId: number, bookId: number): Promise<void> {
  await run('DELETE FROM study_chapters WHERE kind = ? AND bible_id = ? AND book_id = ?',
    [kind, studyBibleId(kind, bibleId), bookId]);
}
