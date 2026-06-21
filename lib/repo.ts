import * as api from '@/lib/api';
import { getIsOnline } from '@/lib/network';
import {
  cacheBibleCatalog,
  cacheBooks,
  cacheChapterVerses,
  deleteDownloadedBible,
  downloadBible,
  getDownloadedSize,
  getLocalBooks,
  getLocalVerses,
  isBibleDownloaded,
  listLocalBibles,
  type DownloadProgress,
} from '@/lib/offline/bibleStore';
import {
  createLocalNotebook,
  createLocalNote,
  deleteLocalNotebook,
  deleteLocalNote,
  getLocalNote,
  getLocalNotebook,
  listLocalNotebooks,
  listLocalNotes,
  resolveNotebookLocalId,
  updateLocalNotebook,
  updateLocalNote,
} from '@/lib/offline/notesStore';
import {
  addLocalFavorite,
  getLocalChapterFavorites,
  getLocalChapterNotes,
  getLocalHighlights,
  removeLocalFavorite,
  saveLocalVerseNote,
  setLocalHighlight,
  upsertFavoritesFromServer,
  upsertHighlightsFromServer,
  upsertVerseNotesFromServer,
} from '@/lib/offline/readerStore';
import { syncAll } from '@/lib/sync';
import type { BibleVersion, Book, Notebook, NotebookNote, Verse } from '@/lib/types';

export { downloadBible, deleteDownloadedBible, getDownloadedSize, listLocalBibles, isBibleDownloaded };
export type { DownloadProgress };

export async function initOffline() {
  const { getDb } = await import('@/lib/db');
  await getDb();
  if (getIsOnline()) {
    syncAll().catch(() => {});
  }
}

export async function repoListBibles(): Promise<{ bibles: BibleVersion[] }> {
  if (getIsOnline()) {
    try {
      const res = await api.listBibles();
      await cacheBibleCatalog(res.bibles);
      return res;
    } catch {
      // fall through
    }
  }
  const local = await listLocalBibles();
  if (local.length === 0) throw new Error('Sin conexión y no hay versiones descargadas');
  return { bibles: local.map(({ downloaded: _d, downloadedAt: _a, ...b }) => b) };
}

export async function repoListBooks(bibleId: number): Promise<{ books: Book[] }> {
  if (await isBibleDownloaded(bibleId)) {
    return { books: await getLocalBooks(bibleId) };
  }
  if (getIsOnline()) {
    const res = await api.listBooks(bibleId);
    await cacheBooks(bibleId, res.books);
    return res;
  }
  const books = await getLocalBooks(bibleId);
  if (books.length === 0) throw new Error('Descarga esta versión para leer sin conexión');
  return { books };
}

export async function repoGetVerses(bibleId: number, bookId: number, chapter: number): Promise<{ verses: Verse[] }> {
  if (await isBibleDownloaded(bibleId)) {
    const verses = await getLocalVerses(bibleId, bookId, chapter);
    if (verses.length > 0) return { verses };
  }
  if (getIsOnline()) {
    const res = await api.getVerses(bibleId, bookId, chapter);
    await cacheChapterVerses(bibleId, bookId, chapter, res.verses);
    return res;
  }
  const verses = await getLocalVerses(bibleId, bookId, chapter);
  if (verses.length === 0) throw new Error('Capítulo no disponible offline. Descarga la versión en Perfil → Descargas.');
  return { verses };
}

export async function repoListNotebooks(): Promise<{ notebooks: Notebook[] }> {
  if (getIsOnline()) {
    try {
      const res = await api.listNotebooks();
      for (const nb of res.notebooks) {
        const { upsertNotebookFromServer } = await import('@/lib/offline/notesStore');
        await upsertNotebookFromServer(nb);
      }
      return res;
    } catch {
      // fall through
    }
  }
  return { notebooks: await listLocalNotebooks() };
}

export async function repoListNotebookNotes(notebookId: number): Promise<{ notes: NotebookNote[] }> {
  const localId = await resolveNotebookLocalId(notebookId);
  if (getIsOnline()) {
    try {
      const sid = (await getLocalNotebook(notebookId))?.id ?? notebookId;
      const res = await api.listNotebookNotes(sid > 0 ? sid : notebookId);
      for (const n of res.notes) {
        const { upsertNoteFromServer } = await import('@/lib/offline/notesStore');
        await upsertNoteFromServer(n);
      }
      if (localId) return { notes: await listLocalNotes(notebookId) };
      return res;
    } catch {
      // fall through
    }
  }
  if (!localId) return { notes: [] };
  return { notes: await listLocalNotes(notebookId) };
}

export async function repoGetNotebookNote(noteId: number): Promise<{ note: NotebookNote }> {
  if (getIsOnline() && noteId > 0) {
    try {
      const res = await api.getNotebookNote(noteId);
      const { upsertNoteFromServer } = await import('@/lib/offline/notesStore');
      await upsertNoteFromServer(res.note);
      const local = await getLocalNote(noteId);
      if (local) return { note: local };
      return res;
    } catch {
      // fall through
    }
  }
  const note = await getLocalNote(noteId);
  if (!note) throw new Error('Nota no disponible offline');
  return { note };
}

export async function repoCreateNotebook(name: string, coverImage?: string | null) {
  const local = await createLocalNotebook(name, coverImage);
  if (getIsOnline()) syncAll().catch(() => {});
  return { id: local.id, name: local.name, coverImage: local.coverImage };
}

export async function repoUpdateNotebook(id: number, name: string, coverImage?: string | null) {
  await updateLocalNotebook(id, name, coverImage);
  if (getIsOnline()) syncAll().catch(() => {});
  return { ok: true };
}

export async function repoDeleteNotebook(id: number) {
  await deleteLocalNotebook(id);
  if (getIsOnline()) syncAll().catch(() => {});
  return { ok: true };
}

export async function repoCreateNotebookNote(notebookId: number, title: string, content: string) {
  const note = await createLocalNote(notebookId, title, content);
  if (getIsOnline()) syncAll().catch(() => {});
  return { id: note.id, title: note.title, content: note.content };
}

export async function repoUpdateNotebookNote(noteId: number, title: string, content: string, tags?: string[]) {
  await updateLocalNote(noteId, title, content, tags ? JSON.stringify(tags) : undefined);
  if (getIsOnline()) syncAll().catch(() => {});
  return { ok: true };
}

export async function repoDeleteNotebookNote(noteId: number) {
  await deleteLocalNote(noteId);
  if (getIsOnline()) syncAll().catch(() => {});
  return { ok: true };
}

export async function repoGetHighlights(bookId: number, chapter: number, bibleId: number) {
  if (getIsOnline()) {
    try {
      const res = await api.getHighlights(bookId, chapter, bibleId);
      await upsertHighlightsFromServer(bookId, chapter, bibleId, res.highlights);
      return res;
    } catch {
      // fall through
    }
  }
  return { highlights: await getLocalHighlights(bookId, chapter, bibleId) };
}

export async function repoSetHighlights(
  bookId: number,
  chapter: number,
  verses: number[],
  color: string | null,
  bibleId: number,
) {
  for (const v of verses) {
    await setLocalHighlight(bookId, chapter, v, color, bibleId);
  }
  if (getIsOnline()) {
    try {
      await api.setHighlights(bookId, chapter, verses, color, bibleId);
      const { run } = await import('@/lib/db');
      for (const v of verses) {
        await run(
          'UPDATE highlights SET dirty = 0 WHERE book_id = ? AND chapter = ? AND verse = ? AND bible_id = ?',
          [bookId, chapter, v, bibleId],
        );
      }
    } catch {
      // queued via dirty flag
    }
  }
  return { ok: true };
}

export async function repoListFavorites() {
  if (getIsOnline()) {
    try {
      const res = await api.listFavorites();
      await upsertFavoritesFromServer(res.favorites);
      return res;
    } catch {
      // fall through
    }
  }
  const { getAll } = await import('@/lib/db');
  const rows = await getAll<{
    id: number;
    server_id: number | null;
    bible_id: number;
    book_id: number;
    book_name: string | null;
    chapter: number;
    verse: number;
    verse_text: string | null;
    created_at: string | null;
  }>('SELECT * FROM favorites WHERE deleted = 0 ORDER BY created_at DESC');
  return {
    favorites: rows.map((r) => ({
      id: r.server_id ?? r.id,
      bible_id: r.bible_id,
      book_id: r.book_id,
      book_name: r.book_name ?? '',
      chapter: r.chapter,
      verse: r.verse,
      verse_text: r.verse_text ?? '',
      created_at: r.created_at ?? '',
    })),
  };
}

export async function repoGetChapterFavorites(bibleId: number, bookId: number, chapter: number) {
  if (getIsOnline()) {
    try {
      const res = await api.listFavorites();
      await upsertFavoritesFromServer(res.favorites);
    } catch {
      // use local
    }
  }
  return getLocalChapterFavorites(bibleId, bookId, chapter);
}

export async function repoAddFavorite(bibleId: number, bookId: number, chapter: number, verse: number) {
  await addLocalFavorite(bibleId, bookId, chapter, verse);
  if (getIsOnline()) {
    try {
      const res = await api.addFavorite(bibleId, bookId, chapter, verse);
      const { setFavoriteServerId } = await import('@/lib/offline/readerStore');
      // ponytail: find latest dirty favorite for this verse
      const { getAll } = await import('@/lib/db');
      const row = await getAll<{ id: number }>(
        `SELECT id FROM favorites WHERE bible_id = ? AND book_id = ? AND chapter = ? AND verse = ? AND dirty = 1 ORDER BY id DESC LIMIT 1`,
        [bibleId, bookId, chapter, verse],
      );
      if (row[0]) await setFavoriteServerId(row[0].id, res.id);
    } catch {
      // queued
    }
  }
  return { success: true };
}

export async function repoDeleteFavorite(id: number) {
  await removeLocalFavorite(id);
  if (getIsOnline()) {
    try {
      if (id > 0) await api.deleteFavorite(id);
    } catch {
      // queued
    }
  }
  return { success: true };
}

export async function repoGetChapterNotes(bookId: number, chapter: number) {
  if (getIsOnline()) {
    try {
      const res = await api.getChapterNotes(bookId, chapter);
      await upsertVerseNotesFromServer(bookId, chapter, res.links);
      return res;
    } catch {
      // fall through
    }
  }
  return { links: await getLocalChapterNotes(bookId, chapter) };
}

export async function repoDeleteVerseNote(noteId: number) {
  const { deleteLocalVerseNote } = await import('@/lib/offline/readerStore');
  await deleteLocalVerseNote(noteId);
  if (getIsOnline()) {
    try {
      if (noteId > 0) await api.deleteVerseNote(noteId);
      const { markVerseNoteSynced } = await import('@/lib/offline/readerStore');
      // ponytail: purge handled on next sync pull
    } catch {
      // queued
    }
  }
  return { ok: true };
}

export async function repoSaveVerseNote(bookId: number, chapter: number, verse: number, noteContent: string) {
  await saveLocalVerseNote(bookId, chapter, verse, noteContent);
  if (getIsOnline()) {
    try {
      await api.saveVerseNote(bookId, chapter, verse, noteContent);
    } catch {
      // queued
    }
  }
  return { success: true };
}
