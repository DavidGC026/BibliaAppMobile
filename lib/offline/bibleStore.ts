import * as api from '@/lib/api';
import { getAll, getFirst, nowIso, run } from '@/lib/db';
import type { BibleVersion, Book, Verse } from '@/lib/types';

export type DownloadProgress = { phase: string; current: number; total: number };

interface BibleRow {
  bible_id: number;
  abbr: string;
  name: string;
  downloaded: number;
  downloaded_at: string | null;
}

export async function listLocalBibles(): Promise<(BibleVersion & { downloaded: boolean; downloadedAt?: string })[]> {
  const rows = await getAll<BibleRow>('SELECT * FROM bibles ORDER BY name');
  return rows.map((r) => ({
    bibleId: r.bible_id,
    abbr: r.abbr,
    name: r.name,
    downloaded: r.downloaded === 1,
    downloadedAt: r.downloaded_at ?? undefined,
  }));
}

export async function isBibleDownloaded(bibleId: number) {
  const row = await getFirst<{ downloaded: number }>(
    'SELECT downloaded FROM bibles WHERE bible_id = ?',
    [bibleId],
  );
  return row?.downloaded === 1;
}

export async function getLocalBooks(bibleId: number): Promise<Book[]> {
  const rows = await getAll<{ book_id: number; book_name: string; chapters: number }>(
    'SELECT book_id, book_name, chapters FROM books WHERE bible_id = ? ORDER BY book_id',
    [bibleId],
  );
  return rows.map((r) => ({ bookId: r.book_id, bookName: r.book_name, chapters: r.chapters }));
}

export async function getLocalVerses(bibleId: number, bookId: number, chapter: number): Promise<Verse[]> {
  const rows = await getAll<{ id: number; book_id: number; chapter: number; verse: number; text: string }>(
    `SELECT id, book_id, chapter, verse, text FROM verses
     WHERE bible_id = ? AND book_id = ? AND chapter = ?
     ORDER BY verse`,
    [bibleId, bookId, chapter],
  );
  const book = await getFirst<{ book_name: string }>(
    'SELECT book_name FROM books WHERE bible_id = ? AND book_id = ?',
    [bibleId, bookId],
  );
  const bookName = book?.book_name ?? '';
  return rows.map((r) => ({
    id: r.id,
    bookId: r.book_id,
    bookName,
    chapter: r.chapter,
    verse: r.verse,
    text: r.text,
  }));
}

export async function getDownloadedSize(bibleId: number): Promise<number> {
  const row = await getFirst<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM verses WHERE bible_id = ?',
    [bibleId],
  );
  return row?.cnt ?? 0;
}

async function upsertBibleMeta(b: BibleVersion) {
  await run(
    `INSERT INTO bibles (bible_id, abbr, name, downloaded, downloaded_at)
     VALUES (?, ?, ?, 0, NULL)
     ON CONFLICT(bible_id) DO UPDATE SET abbr = excluded.abbr, name = excluded.name`,
    [b.bibleId, b.abbr, b.name],
  );
}

async function fetchBookVersesBulk(bibleId: number, bookId: number): Promise<Verse[] | null> {
  try {
    const { verses } = await api.getVersesBulk(bibleId, bookId);
    return verses;
  } catch {
    return null;
  }
}

async function fetchBookVersesByChapter(
  bibleId: number,
  bookId: number,
  chapters: number,
): Promise<Verse[]> {
  const all: Verse[] = [];
  for (let ch = 1; ch <= chapters; ch++) {
    const { verses } = await api.getVerses(bibleId, bookId, ch);
    all.push(...verses);
  }
  return all;
}

async function insertVerses(bibleId: number, verses: Verse[]) {
  for (const v of verses) {
    await run(
      `INSERT OR REPLACE INTO verses (bible_id, book_id, chapter, verse, id, text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bibleId, v.bookId, v.chapter, v.verse, v.id, v.text],
    );
  }
}

export async function downloadBible(
  bibleId: number,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  const { bibles } = await api.listBibles();
  const meta = bibles.find((b) => b.bibleId === bibleId);
  if (!meta) throw new Error('Versión no encontrada');

  await upsertBibleMeta(meta);
  const { books } = await api.listBooks(bibleId);

  for (const book of books) {
    await run(
      `INSERT OR REPLACE INTO books (bible_id, book_id, book_name, chapters)
       VALUES (?, ?, ?, ?)`,
      [bibleId, book.bookId, book.bookName, book.chapters],
    );
  }

  const total = books.length;
  let current = 0;

  for (const book of books) {
    current++;
    onProgress?.({ phase: book.bookName, current, total });

    let verses = await fetchBookVersesBulk(bibleId, book.bookId);
    if (!verses) {
      verses = await fetchBookVersesByChapter(bibleId, book.bookId, book.chapters);
    }
    await insertVerses(bibleId, verses);
  }

  await run('UPDATE bibles SET downloaded = 1, downloaded_at = ? WHERE bible_id = ?', [
    nowIso(),
    bibleId,
  ]);
}

export async function deleteDownloadedBible(bibleId: number) {
  await run('DELETE FROM verses WHERE bible_id = ?', [bibleId]);
  await run('DELETE FROM books WHERE bible_id = ?', [bibleId]);
  await run('UPDATE bibles SET downloaded = 0, downloaded_at = NULL WHERE bible_id = ?', [bibleId]);
}

export async function cacheBibleCatalog(bibles: BibleVersion[]) {
  for (const b of bibles) {
    await upsertBibleMeta(b);
  }
}

export async function cacheBooks(bibleId: number, books: Book[]) {
  for (const book of books) {
    await run(
      `INSERT OR REPLACE INTO books (bible_id, book_id, book_name, chapters)
       VALUES (?, ?, ?, ?)`,
      [bibleId, book.bookId, book.bookName, book.chapters],
    );
  }
}

export async function cacheChapterVerses(bibleId: number, bookId: number, chapter: number, verses: Verse[]) {
  await insertVerses(bibleId, verses);
}
