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
  evictNotebook,
  evictNote,
  getLocalNote,
  listLocalNotebooks,
  listLocalNotes,
  resolveNotebookLocalId,
  updateLocalNotebook,
  updateLocalNote,
  upsertNoteFromServer,
  upsertNotebookFromServer,
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
import {
  areCrossRefsDownloaded,
  deleteCrossReferences,
  deleteDictionary,
  downloadCrossReferences,
  downloadDictionary,
  getChapterArcs,
  getCrossRefsDownloadInfo,
  getDictionaryDownloadInfo,
  getLocalCrossReferences,
  getLocalDictionaryEntry,
  isDictionaryDownloaded,
  searchLocalDictionary,
  type StudyDownloadInfo,
  type StudyDownloadProgress,
} from '@/lib/offline/studyStore';
import { syncAll } from '@/lib/sync';
import { nowIso } from '@/lib/db';
import type { BibleVersion, Book, CrossReference, Notebook, NotebookNote, StrongEntry, Verse } from '@/lib/types';

export { downloadBible, deleteDownloadedBible, getDownloadedSize, listLocalBibles, isBibleDownloaded };
export {
  areCrossRefsDownloaded,
  deleteCrossReferences,
  deleteDictionary,
  downloadCrossReferences,
  downloadDictionary,
  getChapterArcs,
  getCrossRefsDownloadInfo,
  getDictionaryDownloadInfo,
  isDictionaryDownloaded,
};
export type { DownloadProgress, StudyDownloadInfo, StudyDownloadProgress };

/** Online + sesión → trabajar contra el servidor; offline → SQLite. */
function useRemote(): boolean {
  return getIsOnline() && !!api.getApiToken();
}

async function cacheNotebooksFromServer(notebooks: Notebook[]) {
  for (const nb of notebooks) await upsertNotebookFromServer(nb);
}

async function cacheNotesFromServer(notes: NotebookNote[]) {
  for (const n of notes) await upsertNoteFromServer(n);
}

export async function initOffline() {
  const { getDb } = await import('@/lib/db');
  await getDb();
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

export async function repoGetCrossReferences(
  bibleId: number,
  bookId: number,
  chapter: number,
  verse: number,
): Promise<{ references: CrossReference[] }> {
  if (getIsOnline()) {
    try {
      return await api.getCrossReferences(bibleId, bookId, chapter, verse);
    } catch {
      // Caída puntual del servidor: probar la copia local
    }
  }
  if (await areCrossRefsDownloaded()) {
    return { references: await getLocalCrossReferences(bibleId, bookId, chapter, verse) };
  }
  throw new Error('Referencias no disponibles offline. Descárgalas en Perfil → Descargas.');
}

export async function repoSearchDictionary(opts: {
  dict?: string;
  q?: string;
  lang?: 'all' | 'greek' | 'hebrew';
  page?: number;
  browse?: boolean;
}): Promise<{ entries: StrongEntry[]; total: number; page: number; pageSize: number; totalPages: number }> {
  if (getIsOnline()) {
    try {
      return await api.searchDictionary(opts);
    } catch {
      // Caída puntual del servidor: probar la copia local
    }
  }
  if (await isDictionaryDownloaded(opts.dict ?? 'strong')) {
    return searchLocalDictionary(opts);
  }
  throw new Error('Diccionario no disponible offline. Descárgalo en Perfil → Descargas.');
}

export async function repoGetDictionaryEntry(
  code: string,
  dict = 'strong',
): Promise<{ entry: StrongEntry | null }> {
  if (getIsOnline()) {
    try {
      return await api.getDictionaryEntry(code, dict);
    } catch {
      // Caída puntual del servidor: probar la copia local
    }
  }
  if (await isDictionaryDownloaded(dict)) {
    return { entry: await getLocalDictionaryEntry(code, dict) };
  }
  throw new Error('Diccionario no disponible offline. Descárgalo en Perfil → Descargas.');
}

async function refreshNotebooksFromServer() {
  const res = await api.listNotebooks();
  await cacheNotebooksFromServer(res.notebooks);
  for (const nb of res.notebooks) {
    const { notes } = await api.listNotebookNotes(nb.id);
    await cacheNotesFromServer(notes);
  }
}

/** Online: sync/push + pull → SQLite unificado. Offline: solo SQLite. */
async function loadNotebooksView(): Promise<{ notebooks: Notebook[] }> {
  if (useRemote()) {
    try {
      await syncAll();
    } catch {
      try {
        await refreshNotebooksFromServer();
      } catch {
        // ponytail: muestra lo que haya en SQLite
      }
    }
  }
  return { notebooks: await listLocalNotebooks() };
}

async function loadNotebookNotesView(notebookId: number): Promise<{ notes: NotebookNote[] }> {
  if (useRemote()) {
    try {
      await syncAll();
    } catch {
      try {
        const res = await api.listNotebookNotes(notebookId);
        await cacheNotesFromServer(res.notes);
      } catch {
        // ponytail: muestra lo que haya en SQLite
      }
    }
  }
  if (!(await resolveNotebookLocalId(notebookId))) return { notes: [] };
  return { notes: await listLocalNotes(notebookId) };
}

export async function repoListNotebooks(): Promise<{ notebooks: Notebook[] }> {
  return loadNotebooksView();
}

export async function repoListNotebookNotes(notebookId: number): Promise<{ notes: NotebookNote[] }> {
  return loadNotebookNotesView(notebookId);
}

export async function repoGetNotebookNote(noteId: number): Promise<{ note: NotebookNote }> {
  if (useRemote() && noteId > 0) {
    try {
      const res = await api.getNotebookNote(noteId);
      await upsertNoteFromServer(res.note);
      return res;
    } catch {
      // cae a SQLite (p. ej. nota solo local aún)
    }
  }
  const note = await getLocalNote(noteId);
  if (!note) throw new Error('Nota no disponible offline');
  return { note };
}

export async function repoCreateNotebook(name: string, coverImage?: string | null) {
  if (useRemote()) {
    try {
      const res = await api.createNotebook(name, coverImage);
      const ts = nowIso();
      await upsertNotebookFromServer({ id: res.id, name: res.name, coverImage: res.coverImage, createdAt: ts });
      return { id: res.id, name: res.name, coverImage: res.coverImage ?? null };
    } catch {
      // cae a cola offline
    }
  }
  const local = await createLocalNotebook(name, coverImage);
  return { id: local.id, name: local.name, coverImage: local.coverImage };
}

export async function repoUpdateNotebook(id: number, name: string, coverImage?: string | null) {
  if (useRemote() && id > 0) {
    try {
      await api.updateNotebook(id, name, coverImage);
      const ts = nowIso();
      await upsertNotebookFromServer({ id, name, coverImage, createdAt: ts });
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  await updateLocalNotebook(id, name, coverImage);
  return { ok: true };
}

export async function repoDeleteNotebook(id: number) {
  if (useRemote() && id > 0) {
    try {
      await api.deleteNotebook(id);
      await evictNotebook(id);
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  await deleteLocalNotebook(id);
  return { ok: true };
}

export async function repoCreateNotebookNote(notebookId: number, title: string, content: string) {
  const finalTitle = title.trim() || 'Sin título';
  if (useRemote() && notebookId > 0) {
    try {
      const res = await api.createNotebookNote(notebookId, finalTitle, content);
      const ts = nowIso();
      await upsertNoteFromServer({
        id: res.id,
        notebookId,
        title: res.title,
        content: res.content,
        tags: '[]',
        createdAt: ts,
        updatedAt: ts,
      });
      return { id: res.id, title: res.title, content: res.content };
    } catch {
      // cae a cola offline
    }
  }
  const note = await createLocalNote(notebookId, finalTitle, content);
  return { id: note.id, title: note.title, content: note.content };
}

export async function repoUpdateNotebookNote(noteId: number, title: string, content: string, tags?: string[]) {
  const finalTitle = title.trim() || 'Sin título';
  if (useRemote() && noteId > 0) {
    try {
      await api.updateNotebookNote(noteId, finalTitle, content, tags);
      const fresh = await api.getNotebookNote(noteId);
      await upsertNoteFromServer(fresh.note);
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  await updateLocalNote(noteId, finalTitle, content, tags ? JSON.stringify(tags) : undefined);
  return { ok: true };
}

export async function repoDeleteNotebookNote(noteId: number) {
  if (useRemote() && noteId > 0) {
    try {
      await api.deleteNotebookNote(noteId);
      await evictNote(noteId);
      return { ok: true };
    } catch {
      // cae a cola offline
    }
  }
  await deleteLocalNote(noteId);
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
