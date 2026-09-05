import * as SQLite from 'expo-sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bibles (
  bible_id INTEGER PRIMARY KEY NOT NULL,
  abbr TEXT NOT NULL,
  name TEXT NOT NULL,
  capabilities_json TEXT,
  downloaded INTEGER NOT NULL DEFAULT 0,
  downloaded_at TEXT
);

CREATE TABLE IF NOT EXISTS books (
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  book_name TEXT NOT NULL,
  chapters INTEGER NOT NULL,
  PRIMARY KEY (bible_id, book_id)
);

CREATE TABLE IF NOT EXISTS verses (
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  id INTEGER,
  text TEXT NOT NULL,
  PRIMARY KEY (bible_id, book_id, chapter, verse)
);

CREATE TABLE IF NOT EXISTS notebooks (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  name TEXT NOT NULL,
  cover_image TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  notebook_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

-- Imágenes de nota ya subidas, por hash de sus bytes: evita volver a subir la
-- misma foto cada vez que se guarda la nota. Ver lib/noteImageSync.ts.
CREATE TABLE IF NOT EXISTS note_image_uploads (
  hash TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  verse_text TEXT,
  book_name TEXT,
  created_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS verse_notes (
  id INTEGER PRIMARY KEY NOT NULL,
  server_id INTEGER,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  note_content TEXT,
  created_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dictionary_entries (
  dict TEXT NOT NULL,
  code TEXT NOT NULL,
  lemma TEXT,
  transliteration TEXT,
  definition TEXT,
  PRIMARY KEY (dict, code)
);

-- Una respuesta completa por capítulo: la sustitución es atómica, incluso si
-- se cierra la app durante una descarga. El interlineal usa bible_id = 0.
CREATE TABLE IF NOT EXISTS study_chapters (
  kind TEXT NOT NULL,
  bible_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (kind, bible_id, book_id, chapter)
);

CREATE TABLE IF NOT EXISTS cross_references (
  vid_origen INTEGER NOT NULL,
  vid_destino INTEGER NOT NULL,
  votos INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_crossrefs_origen ON cross_references(vid_origen);
-- Las referencias se guardan en un solo sentido, así que buscar «quién cita a
-- este capítulo» recorre la tabla por destino.
CREATE INDEX IF NOT EXISTS idx_crossrefs_destino ON cross_references(vid_destino);
CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(bible_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
CREATE INDEX IF NOT EXISTS idx_highlights_chapter ON highlights(bible_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_favorites_chapter ON favorites(bible_id, book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_verse_notes_chapter ON verse_notes(book_id, chapter);
`;

let dbReady: Promise<SQLite.SQLiteDatabase> | null = null;

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(SCHEMA);
  try {
    await db.execAsync('ALTER TABLE bibles ADD COLUMN capabilities_json TEXT;');
  } catch {
    // La columna ya existe en instalaciones nuevas o previamente migradas.
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbReady) {
    dbReady = SQLite.openDatabaseAsync('bibliaapp.db').then(async (db) => {
      await initSchema(db);
      return db;
    });
  }
  return dbReady;
}

export async function run(sql: string, params: (string | number | null)[] = []) {
  const db = await getDb();
  return db.runAsync(sql, params);
}

export async function getFirst<T>(sql: string, params: (string | number | null)[] = []): Promise<T | null> {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, params);
}

export async function getAll<T>(sql: string, params: (string | number | null)[] = []): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(sql, params);
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await getFirst<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  await run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
}

export function tempId() {
  return -Math.abs(Date.now());
}

export function nowIso() {
  return new Date().toISOString();
}
