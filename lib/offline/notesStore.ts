import { getAll, getFirst, nowIso, run, tempId } from '@/lib/db';
import type { Notebook, NotebookNote } from '@/lib/types';

interface NotebookRow {
  id: number;
  server_id: number | null;
  name: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  dirty: number;
  deleted: number;
}

interface NoteRow {
  id: number;
  server_id: number | null;
  notebook_id: number;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
  dirty: number;
  deleted: number;
}

function mapNotebook(r: NotebookRow): Notebook {
  return {
    id: r.server_id ?? r.id,
    name: r.name,
    coverImage: r.cover_image,
    createdAt: r.created_at,
  };
}

function mapNote(r: NoteRow): NotebookNote {
  return {
    id: r.server_id ?? r.id,
    notebookId: r.notebook_id,
    title: r.title,
    content: r.content,
    tags: r.tags,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listLocalNotebooks(): Promise<Notebook[]> {
  const rows = await getAll<NotebookRow>(
    'SELECT * FROM notebooks WHERE deleted = 0 ORDER BY updated_at DESC',
  );
  return rows.map(mapNotebook);
}

export async function getLocalNotebook(id: number): Promise<Notebook | null> {
  const row = await getFirst<NotebookRow>(
    'SELECT * FROM notebooks WHERE deleted = 0 AND (id = ? OR server_id = ?)',
    [id, id],
  );
  return row ? mapNotebook(row) : null;
}

export async function listLocalNotes(notebookId: number): Promise<NotebookNote[]> {
  const nb = await getFirst<{ id: number }>(
    'SELECT id FROM notebooks WHERE deleted = 0 AND (id = ? OR server_id = ?)',
    [notebookId, notebookId],
  );
  if (!nb) return [];
  const rows = await getAll<NoteRow & { notebook_display_id: number }>(
    `SELECT n.*, COALESCE(b.server_id, b.id) AS notebook_display_id
     FROM notes n
     JOIN notebooks b ON n.notebook_id = b.id
     WHERE n.deleted = 0 AND n.notebook_id = ?
     ORDER BY n.updated_at DESC`,
    [nb.id],
  );
  return rows.map((r) => ({
    id: r.server_id ?? r.id,
    notebookId: r.notebook_display_id,
    title: r.title,
    content: r.content,
    tags: r.tags,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getLocalNote(id: number): Promise<NotebookNote | null> {
  const row = await getFirst<NoteRow>(
    'SELECT * FROM notes WHERE deleted = 0 AND (id = ? OR server_id = ?)',
    [id, id],
  );
  return row ? mapNote(row) : null;
}

export async function createLocalNotebook(name: string, coverImage?: string | null): Promise<Notebook> {
  const id = tempId();
  const ts = nowIso();
  await run(
    `INSERT INTO notebooks (id, server_id, name, cover_image, created_at, updated_at, dirty, deleted)
     VALUES (?, NULL, ?, ?, ?, ?, 1, 0)`,
    [id, name, coverImage ?? null, ts, ts],
  );
  return { id, name, coverImage, createdAt: ts };
}

export async function updateLocalNotebook(id: number, name: string, coverImage?: string | null) {
  const row = await getFirst<{ id: number }>(
    'SELECT id FROM notebooks WHERE id = ? OR server_id = ?',
    [id, id],
  );
  if (!row) throw new Error('Cuaderno no encontrado');
  await run(
    `UPDATE notebooks SET name = ?, cover_image = ?, updated_at = ?, dirty = 1 WHERE id = ?`,
    [name, coverImage ?? null, nowIso(), row.id],
  );
}

export async function deleteLocalNotebook(id: number) {
  const row = await getFirst<{ id: number; server_id: number | null }>(
    'SELECT id, server_id FROM notebooks WHERE id = ? OR server_id = ?',
    [id, id],
  );
  if (!row) return;
  await run('UPDATE notebooks SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?', [nowIso(), row.id]);
  await run('UPDATE notes SET deleted = 1, dirty = 1, updated_at = ? WHERE notebook_id = ?', [nowIso(), row.id]);
}

export async function createLocalNote(notebookId: number, title: string, content: string, tags = '[]'): Promise<NotebookNote> {
  const nb = await getFirst<{ id: number }>(
    'SELECT id FROM notebooks WHERE id = ? OR server_id = ?',
    [notebookId, notebookId],
  );
  if (!nb) throw new Error('Cuaderno no encontrado');
  const id = tempId();
  const ts = nowIso();
  await run(
    `INSERT INTO notes (id, server_id, notebook_id, title, content, tags, created_at, updated_at, dirty, deleted)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [id, nb.id, title, content, tags, ts, ts],
  );
  return { id, notebookId: nb.id, title, content, tags, createdAt: ts, updatedAt: ts };
}

export async function updateLocalNote(id: number, title: string, content: string, tags?: string) {
  const row = await getFirst<{ id: number }>('SELECT id FROM notes WHERE id = ? OR server_id = ?', [id, id]);
  if (!row) throw new Error('Nota no encontrada');
  if (tags !== undefined) {
    await run(
      'UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [title, content, tags, nowIso(), row.id],
    );
  } else {
    await run(
      'UPDATE notes SET title = ?, content = ?, updated_at = ?, dirty = 1 WHERE id = ?',
      [title, content, nowIso(), row.id],
    );
  }
}

export async function deleteLocalNote(id: number) {
  const row = await getFirst<{ id: number }>('SELECT id FROM notes WHERE id = ? OR server_id = ?', [id, id]);
  if (!row) return;
  await run('UPDATE notes SET deleted = 1, dirty = 1, updated_at = ? WHERE id = ?', [nowIso(), row.id]);
}

export async function upsertNotebookFromServer(n: Notebook) {
  const existing = await getFirst<{ id: number; updated_at: string; dirty: number }>(
    'SELECT id, updated_at, dirty FROM notebooks WHERE server_id = ? OR id = ?',
    [n.id, n.id],
  );
  if (existing?.dirty) return;
  if (existing && existing.updated_at > n.createdAt) return;
  const rowId = existing?.id ?? n.id;
  await run(
    `INSERT INTO notebooks (id, server_id, name, cover_image, created_at, updated_at, dirty, deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0)
     ON CONFLICT(id) DO UPDATE SET
       server_id = excluded.server_id,
       name = excluded.name,
       cover_image = excluded.cover_image,
       updated_at = excluded.updated_at,
       dirty = 0,
       deleted = 0`,
    [rowId, n.id, n.name, n.coverImage ?? null, n.createdAt, n.createdAt],
  );
}

export async function upsertNoteFromServer(n: NotebookNote) {
  const existing = await getFirst<{ id: number; updated_at: string; dirty: number }>(
    'SELECT id, updated_at, dirty FROM notes WHERE server_id = ? OR id = ?',
    [n.id, n.id],
  );
  if (existing?.dirty) return;
  if (existing && existing.updated_at > n.updatedAt) return;
  const nb = await getFirst<{ id: number }>(
    'SELECT id FROM notebooks WHERE server_id = ? OR id = ?',
    [n.notebookId, n.notebookId],
  );
  const notebookLocalId = nb?.id ?? n.notebookId;
  const rowId = existing?.id ?? n.id;
  await run(
    `INSERT INTO notes (id, server_id, notebook_id, title, content, tags, created_at, updated_at, dirty, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
     ON CONFLICT(id) DO UPDATE SET
       server_id = excluded.server_id,
       notebook_id = excluded.notebook_id,
       title = excluded.title,
       content = excluded.content,
       tags = excluded.tags,
       updated_at = excluded.updated_at,
       dirty = 0,
       deleted = 0`,
    [
      rowId,
      n.id,
      notebookLocalId,
      n.title,
      n.content,
      n.tags ?? '[]',
      n.createdAt,
      n.updatedAt,
    ],
  );
}

export async function getDirtyNotebooks() {
  return getAll<NotebookRow>('SELECT * FROM notebooks WHERE dirty = 1');
}

export async function getDirtyNotes() {
  return getAll<NoteRow>('SELECT * FROM notes WHERE dirty = 1');
}

export async function setNotebookServerId(localId: number, serverId: number) {
  await run('UPDATE notebooks SET server_id = ?, dirty = 0 WHERE id = ?', [serverId, localId]);
}

export async function setNoteServerId(localId: number, serverId: number) {
  await run('UPDATE notes SET server_id = ?, dirty = 0 WHERE id = ?', [serverId, localId]);
}

export async function markNotebookSynced(localId: number) {
  await run('UPDATE notebooks SET dirty = 0 WHERE id = ?', [localId]);
}

export async function markNoteSynced(localId: number) {
  await run('UPDATE notes SET dirty = 0 WHERE id = ?', [localId]);
}

export async function purgeDeletedNotebook(localId: number) {
  await run('DELETE FROM notes WHERE notebook_id = ?', [localId]);
  await run('DELETE FROM notebooks WHERE id = ?', [localId]);
}

export async function purgeDeletedNote(localId: number) {
  await run('DELETE FROM notes WHERE id = ?', [localId]);
}

export async function evictNotebook(id: number) {
  const row = await getFirst<{ id: number }>(
    'SELECT id FROM notebooks WHERE id = ? OR server_id = ?',
    [id, id],
  );
  if (!row) return;
  await run('DELETE FROM notes WHERE notebook_id = ?', [row.id]);
  await run('DELETE FROM notebooks WHERE id = ?', [row.id]);
}

export async function evictNote(id: number) {
  const row = await getFirst<{ id: number }>(
    'SELECT id FROM notes WHERE id = ? OR server_id = ?',
    [id, id],
  );
  if (!row) return;
  await run('DELETE FROM notes WHERE id = ?', [row.id]);
}

export async function resolveNotebookLocalId(id: number): Promise<number | null> {
  const row = await getFirst<{ id: number }>(
    'SELECT id FROM notebooks WHERE id = ? OR server_id = ?',
    [id, id],
  );
  return row?.id ?? null;
}

/**
 * Repara datos corruptos de versiones anteriores:
 * - Fusiona filas de libreta duplicadas que comparten server_id.
 * - Re-vincula notas huérfanas (en una libreta sin server_id) a la libreta
 *   del servidor con el mismo nombre, y las marca dirty para que suban.
 * ponytail: barrido O(n) sobre libretas locales; corre una vez por sync.
 */
export async function repairNotebookData(): Promise<void> {
  const all = await getAll<NotebookRow>('SELECT * FROM notebooks');

  // 1) Fusionar duplicados con el mismo server_id.
  const byServer = new Map<number, NotebookRow[]>();
  for (const nb of all) {
    if (nb.server_id == null) continue;
    const arr = byServer.get(nb.server_id) ?? [];
    arr.push(nb);
    byServer.set(nb.server_id, arr);
  }
  for (const [serverId, rows] of byServer) {
    if (rows.length < 2) continue;
    const canonical = rows.find((r) => r.id === serverId) ?? rows[0];
    for (const r of rows) {
      if (r.id === canonical.id) continue;
      await run('UPDATE notes SET notebook_id = ? WHERE notebook_id = ?', [canonical.id, r.id]);
      await run('DELETE FROM notebooks WHERE id = ?', [r.id]);
    }
  }

  // 2) Huérfanas sin server_id (y ya sincronizadas, no nuevas): fusionar con la
  //    libreta del servidor del mismo nombre y empujar sus notas.
  const fresh = await getAll<NotebookRow>('SELECT * FROM notebooks');
  const serverByName = new Map<string, NotebookRow>();
  for (const nb of fresh) {
    if (nb.server_id != null) serverByName.set(nb.name, nb);
  }
  for (const nb of fresh) {
    if (nb.server_id != null || nb.dirty) continue;
    const target = serverByName.get(nb.name);
    if (target && target.id !== nb.id) {
      await run('UPDATE notes SET notebook_id = ?, dirty = 1 WHERE notebook_id = ?', [target.id, nb.id]);
      await run('DELETE FROM notebooks WHERE id = ?', [nb.id]);
    }
  }
}
