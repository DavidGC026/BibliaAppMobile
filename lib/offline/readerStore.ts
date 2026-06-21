import { getAll, getFirst, nowIso, run, tempId } from '@/lib/db';
import type { Favorite, VerseHighlight, VerseNoteLink } from '@/lib/types';

export async function getLocalHighlights(
  bookId: number,
  chapter: number,
  bibleId: number,
): Promise<VerseHighlight[]> {
  const rows = await getAll<{ verse: number; color: string }>(
    `SELECT verse, color FROM highlights
     WHERE deleted = 0 AND book_id = ? AND chapter = ? AND bible_id = ?`,
    [bookId, chapter, bibleId],
  );
  return rows.map((r) => ({ verse: r.verse, color: r.color }));
}

export async function setLocalHighlight(
  bookId: number,
  chapter: number,
  verse: number,
  color: string | null,
  bibleId: number,
) {
  const existing = await getFirst<{ id: number }>(
    `SELECT id FROM highlights
     WHERE book_id = ? AND chapter = ? AND verse = ? AND bible_id = ? AND deleted = 0`,
    [bookId, chapter, verse, bibleId],
  );
  if (color === null) {
    if (existing) {
      await run('UPDATE highlights SET deleted = 1, dirty = 1 WHERE id = ?', [existing.id]);
    }
    return;
  }
  if (existing) {
    await run('UPDATE highlights SET color = ?, dirty = 1, deleted = 0 WHERE id = ?', [color, existing.id]);
    return;
  }
  const id = tempId();
  await run(
    `INSERT INTO highlights (id, server_id, bible_id, book_id, chapter, verse, color, created_at, dirty, deleted)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [id, bibleId, bookId, chapter, verse, color, nowIso()],
  );
}

export async function getLocalChapterFavorites(
  bibleId: number,
  bookId: number,
  chapter: number,
): Promise<Map<number, number>> {
  const rows = await getAll<{ id: number; server_id: number | null; verse: number }>(
    `SELECT id, server_id, verse FROM favorites
     WHERE deleted = 0 AND bible_id = ? AND book_id = ? AND chapter = ?`,
    [bibleId, bookId, chapter],
  );
  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.verse, r.server_id ?? r.id);
  }
  return map;
}

export async function addLocalFavorite(
  bibleId: number,
  bookId: number,
  chapter: number,
  verse: number,
  verseText?: string,
  bookName?: string,
) {
  const existing = await getFirst<{ id: number }>(
    `SELECT id FROM favorites
     WHERE deleted = 0 AND bible_id = ? AND book_id = ? AND chapter = ? AND verse = ?`,
    [bibleId, bookId, chapter, verse],
  );
  if (existing) return existing.id;
  const id = tempId();
  await run(
    `INSERT INTO favorites (id, server_id, bible_id, book_id, chapter, verse, verse_text, book_name, created_at, dirty, deleted)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [id, bibleId, bookId, chapter, verse, verseText ?? null, bookName ?? null, nowIso()],
  );
  return id;
}

export async function removeLocalFavorite(id: number) {
  const row = await getFirst<{ id: number }>(
    'SELECT id FROM favorites WHERE id = ? OR server_id = ?',
    [id, id],
  );
  if (!row) return;
  await run('UPDATE favorites SET deleted = 1, dirty = 1 WHERE id = ?', [row.id]);
}

export async function getLocalChapterNotes(bookId: number, chapter: number): Promise<VerseNoteLink[]> {
  const rows = await getAll<{
    id: number;
    server_id: number | null;
    book_id: number;
    chapter: number;
    verse: number;
    note_content: string | null;
    created_at: string | null;
  }>(
    `SELECT id, server_id, book_id, chapter, verse, note_content, created_at FROM verse_notes
     WHERE deleted = 0 AND book_id = ? AND chapter = ?`,
    [bookId, chapter],
  );
  return rows.map((r) => ({
    id: r.server_id ?? r.id,
    bookId: r.book_id,
    chapter: r.chapter,
    verse: r.verse,
    noteContent: r.note_content ?? undefined,
    createdAt: r.created_at ?? undefined,
  }));
}

export async function saveLocalVerseNote(
  bookId: number,
  chapter: number,
  verse: number,
  noteContent: string,
) {
  const existing = await getFirst<{ id: number }>(
    'SELECT id FROM verse_notes WHERE deleted = 0 AND book_id = ? AND chapter = ? AND verse = ?',
    [bookId, chapter, verse],
  );
  if (existing) {
    await run(
      'UPDATE verse_notes SET note_content = ?, dirty = 1 WHERE id = ?',
      [noteContent, existing.id],
    );
    return existing.id;
  }
  const id = tempId();
  await run(
    `INSERT INTO verse_notes (id, server_id, book_id, chapter, verse, note_content, created_at, dirty, deleted)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 0)`,
    [id, bookId, chapter, verse, noteContent, nowIso()],
  );
  return id;
}

export async function upsertHighlightsFromServer(
  bookId: number,
  chapter: number,
  bibleId: number,
  highlights: VerseHighlight[],
) {
  for (const h of highlights) {
    const existing = await getFirst<{ id: number; dirty: number }>(
      `SELECT id, dirty FROM highlights
       WHERE book_id = ? AND chapter = ? AND verse = ? AND bible_id = ?`,
      [bookId, chapter, h.verse, bibleId],
    );
    if (existing?.dirty) continue;
    if (existing) {
      await run('UPDATE highlights SET color = ?, deleted = 0, dirty = 0 WHERE id = ?', [h.color, existing.id]);
    } else {
      const id = tempId();
      await run(
        `INSERT INTO highlights (id, server_id, bible_id, book_id, chapter, verse, color, created_at, dirty, deleted)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [id, bibleId, bookId, chapter, h.verse, h.color, nowIso()],
      );
    }
  }
}

export async function upsertFavoritesFromServer(favorites: Favorite[]) {
  for (const f of favorites) {
    const existing = await getFirst<{ id: number; dirty: number }>(
      'SELECT id, dirty FROM favorites WHERE server_id = ? OR id = ?',
      [f.id, f.id],
    );
    if (existing?.dirty) continue;
    await run(
      `INSERT INTO favorites (id, server_id, bible_id, book_id, chapter, verse, verse_text, book_name, created_at, dirty, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
       ON CONFLICT(id) DO UPDATE SET
         verse_text = excluded.verse_text,
         book_name = excluded.book_name,
         deleted = 0,
         dirty = 0`,
      [
        f.id,
        f.id,
        f.bible_id,
        f.book_id,
        f.chapter,
        f.verse,
        f.verse_text,
        f.book_name,
        f.created_at,
      ],
    );
  }
}

export async function upsertVerseNotesFromServer(bookId: number, chapter: number, links: VerseNoteLink[]) {
  for (const l of links) {
    const existing = await getFirst<{ id: number; dirty: number }>(
      'SELECT id, dirty FROM verse_notes WHERE server_id = ? OR id = ?',
      [l.id, l.id],
    );
    if (existing?.dirty) continue;
    await run(
      `INSERT INTO verse_notes (id, server_id, book_id, chapter, verse, note_content, created_at, dirty, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
       ON CONFLICT(id) DO UPDATE SET
         note_content = excluded.note_content,
         deleted = 0,
         dirty = 0`,
      [l.id, l.id, l.bookId, l.chapter, l.verse, l.noteContent ?? null, l.createdAt ?? nowIso()],
    );
  }
}

export async function getDirtyHighlights() {
  return getAll<{
    id: number;
    server_id: number | null;
    bible_id: number;
    book_id: number;
    chapter: number;
    verse: number;
    color: string;
    deleted: number;
  }>('SELECT * FROM highlights WHERE dirty = 1');
}

export async function getDirtyFavorites() {
  return getAll<{
    id: number;
    server_id: number | null;
    bible_id: number;
    book_id: number;
    chapter: number;
    verse: number;
    deleted: number;
  }>('SELECT * FROM favorites WHERE dirty = 1');
}

export async function getDirtyVerseNotes() {
  return getAll<{
    id: number;
    server_id: number | null;
    book_id: number;
    chapter: number;
    verse: number;
    note_content: string | null;
    deleted: number;
  }>('SELECT * FROM verse_notes WHERE dirty = 1');
}

export async function deleteLocalVerseNote(id: number) {
  const row = await getFirst<{ id: number }>(
    'SELECT id FROM verse_notes WHERE id = ? OR server_id = ?',
    [id, id],
  );
  if (!row) return;
  await run('UPDATE verse_notes SET deleted = 1, dirty = 1 WHERE id = ?', [row.id]);
}

export async function setHighlightServerId(localId: number, serverId: number) {
  await run('UPDATE highlights SET server_id = ?, dirty = 0 WHERE id = ?', [serverId, localId]);
}

export async function setFavoriteServerId(localId: number, serverId: number) {
  await run('UPDATE favorites SET server_id = ?, dirty = 0 WHERE id = ?', [serverId, localId]);
}

export async function setVerseNoteServerId(localId: number, serverId: number) {
  await run('UPDATE verse_notes SET server_id = ?, dirty = 0 WHERE id = ?', [serverId, localId]);
}

export async function purgeHighlight(localId: number) {
  await run('DELETE FROM highlights WHERE id = ?', [localId]);
}

export async function purgeFavorite(localId: number) {
  await run('DELETE FROM favorites WHERE id = ?', [localId]);
}

export async function purgeVerseNote(localId: number) {
  await run('DELETE FROM verse_notes WHERE id = ?', [localId]);
}

export async function markHighlightSynced(localId: number) {
  await run('UPDATE highlights SET dirty = 0 WHERE id = ?', [localId]);
}

export async function markFavoriteSynced(localId: number) {
  await run('UPDATE favorites SET dirty = 0 WHERE id = ?', [localId]);
}

export async function markVerseNoteSynced(localId: number) {
  await run('UPDATE verse_notes SET dirty = 0 WHERE id = ?', [localId]);
}
