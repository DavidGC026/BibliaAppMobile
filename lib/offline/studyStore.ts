import * as api from '@/lib/api';
import { getAll, getFirst, getMeta, nowIso, run, setMeta } from '@/lib/db';
import type { CrossReference, StrongEntry } from '@/lib/types';

export type StudyDownloadProgress = { phase: string; current: number; total: number };

const DICT_PAGE_SIZE = 25;
// SQLite acepta hasta ~32k parámetros por sentencia; estos tamaños dejan
// margen de sobra y mantienen cada INSERT razonable.
const DICT_CHUNK = 250; // 5 columnas → 1250 parámetros
const REFS_CHUNK = 500; // 3 columnas → 1500 parámetros

const dictMetaKey = (dict: string) => `dict_downloaded_${dict}`;
const REFS_META_KEY = 'crossrefs_downloaded';

export interface StudyDownloadInfo {
  downloadedAt: string;
  total: number;
}

function parseInfo(raw: string | null): StudyDownloadInfo | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudyDownloadInfo;
  } catch {
    return null;
  }
}

// — Diccionario Strong —

export async function getDictionaryDownloadInfo(dict = 'strong'): Promise<StudyDownloadInfo | null> {
  return parseInfo(await getMeta(dictMetaKey(dict)));
}

export async function isDictionaryDownloaded(dict = 'strong'): Promise<boolean> {
  return (await getDictionaryDownloadInfo(dict)) !== null;
}

export async function downloadDictionary(
  dict = 'strong',
  onProgress?: (p: StudyDownloadProgress) => void,
): Promise<void> {
  await run('DELETE FROM dictionary_entries WHERE dict = ?', [dict]);
  let page = 1;
  let totalPages = 1;
  let total = 0;
  while (page <= totalPages) {
    const res = await api.exportDictionary(dict, page);
    totalPages = res.totalPages;
    total = res.total;
    onProgress?.({ phase: 'Diccionario', current: page, total: totalPages });
    await run('BEGIN');
    try {
      for (let i = 0; i < res.rows.length; i += DICT_CHUNK) {
        const chunk = res.rows.slice(i, i + DICT_CHUNK);
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const params: (string | null)[] = [];
        for (const [code, lemma, transliteration, definition] of chunk) {
          params.push(dict, code, lemma ?? '', transliteration ?? '', definition ?? '');
        }
        await run(
          `INSERT OR REPLACE INTO dictionary_entries (dict, code, lemma, transliteration, definition) VALUES ${placeholders}`,
          params,
        );
      }
      await run('COMMIT');
    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }
    page++;
  }
  await setMeta(dictMetaKey(dict), JSON.stringify({ downloadedAt: nowIso(), total } satisfies StudyDownloadInfo));
}

export async function deleteDictionary(dict = 'strong'): Promise<void> {
  await run('DELETE FROM dictionary_entries WHERE dict = ?', [dict]);
  await run('DELETE FROM meta WHERE key = ?', [dictMetaKey(dict)]);
}

interface DictRow {
  code: string;
  lemma: string;
  transliteration: string;
  definition: string;
}

function toStrongEntry(r: DictRow): StrongEntry {
  return {
    strongCode: r.code,
    lemma: r.lemma,
    transliteration: r.transliteration,
    definition: r.definition,
  };
}

export async function getLocalDictionaryEntry(code: string, dict = 'strong'): Promise<StrongEntry | null> {
  const row = await getFirst<DictRow>(
    'SELECT code, lemma, transliteration, definition FROM dictionary_entries WHERE dict = ? AND code = ?',
    [dict, code.toUpperCase()],
  );
  return row ? toStrongEntry(row) : null;
}

export async function searchLocalDictionary(opts: {
  dict?: string;
  q?: string;
  lang?: 'all' | 'greek' | 'hebrew';
  page?: number;
  browse?: boolean;
}): Promise<{ entries: StrongEntry[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const dict = opts.dict ?? 'strong';
  const q = (opts.q ?? '').trim();
  const page = Math.max(1, opts.page ?? 1);
  const isCodeQuery = /^[gh]\d+$/i.test(q);

  if (!opts.browse && !isCodeQuery && q.length < 2) {
    return { entries: [], total: 0, page: 1, pageSize: DICT_PAGE_SIZE, totalPages: 1 };
  }

  const where: string[] = ['dict = ?'];
  const params: (string | number)[] = [dict];
  if (opts.lang === 'greek') where.push("code LIKE 'G%'");
  else if (opts.lang === 'hebrew') where.push("code LIKE 'H%'");

  if (q) {
    if (isCodeQuery) {
      where.push('code = ?');
      params.push(q.toUpperCase());
    } else {
      where.push('(lemma LIKE ? OR transliteration LIKE ? OR definition LIKE ? OR code LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `${q.toUpperCase()}%`);
    }
  }

  const whereSql = where.join(' AND ');
  const countRow = await getFirst<{ total: number }>(
    `SELECT COUNT(*) AS total FROM dictionary_entries WHERE ${whereSql}`,
    params,
  );
  const total = countRow?.total ?? 0;
  // Orden natural de códigos Strong: G1, G2… G5624, H1…
  const rows = await getAll<DictRow>(
    `SELECT code, lemma, transliteration, definition
     FROM dictionary_entries
     WHERE ${whereSql}
     ORDER BY SUBSTR(code, 1, 1), CAST(SUBSTR(code, 2) AS INTEGER)
     LIMIT ? OFFSET ?`,
    [...params, DICT_PAGE_SIZE, (page - 1) * DICT_PAGE_SIZE],
  );
  return {
    entries: rows.map(toStrongEntry),
    total,
    page,
    pageSize: DICT_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / DICT_PAGE_SIZE)),
  };
}

// — Referencias cruzadas —

export async function getCrossRefsDownloadInfo(): Promise<StudyDownloadInfo | null> {
  return parseInfo(await getMeta(REFS_META_KEY));
}

export async function areCrossRefsDownloaded(): Promise<boolean> {
  return (await getCrossRefsDownloadInfo()) !== null;
}

export async function downloadCrossReferences(
  onProgress?: (p: StudyDownloadProgress) => void,
): Promise<void> {
  await run('DELETE FROM cross_references');
  let page = 1;
  let totalPages = 1;
  let total = 0;
  while (page <= totalPages) {
    const res = await api.exportCrossReferences(page);
    totalPages = res.totalPages;
    total = res.total;
    onProgress?.({ phase: 'Referencias', current: page, total: totalPages });
    await run('BEGIN');
    try {
      for (let i = 0; i < res.rows.length; i += REFS_CHUNK) {
        const chunk = res.rows.slice(i, i + REFS_CHUNK);
        const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
        const params: number[] = [];
        for (const [origen, destino, votos] of chunk) {
          params.push(origen, destino, votos ?? 0);
        }
        await run(
          `INSERT INTO cross_references (vid_origen, vid_destino, votos) VALUES ${placeholders}`,
          params,
        );
      }
      await run('COMMIT');
    } catch (err) {
      await run('ROLLBACK');
      throw err;
    }
    page++;
  }
  await setMeta(REFS_META_KEY, JSON.stringify({ downloadedAt: nowIso(), total } satisfies StudyDownloadInfo));
}

export async function deleteCrossReferences(): Promise<void> {
  await run('DELETE FROM cross_references');
  await run('DELETE FROM meta WHERE key = ?', [REFS_META_KEY]);
}

// Agregación capítulo-a-capítulo para el diagrama de arcos: claves
// book*1000+chapter (ordenan canónicamente) y tríos aplanados
// [índiceOrigen, índiceDestino, conexiones].
export async function getChapterArcs(): Promise<{ keys: number[]; arcs: number[] }> {
  const rows = await getAll<{ a: number; b: number; n: number }>(
    `SELECT vid_origen / 1000 AS a, vid_destino / 1000 AS b, COUNT(*) AS n
     FROM cross_references
     GROUP BY a, b`,
  );
  const keySet = new Set<number>();
  for (const r of rows) {
    keySet.add(r.a);
    keySet.add(r.b);
  }
  const keys = [...keySet].sort((x, y) => x - y);
  const idx = new Map(keys.map((k, i) => [k, i]));
  const arcs: number[] = [];
  for (const r of rows) {
    arcs.push(idx.get(r.a)!, idx.get(r.b)!, r.n);
  }
  return { keys, arcs };
}

export async function getLocalCrossReferences(
  bibleId: number,
  bookId: number,
  chapter: number,
  verse: number,
): Promise<CrossReference[]> {
  const vid = bookId * 1000000 + chapter * 1000 + verse;
  // El texto del destino solo existe si esa versión está descargada; si no,
  // se muestra la cita sin texto (LEFT JOIN + COALESCE).
  return getAll<CrossReference>(
    `SELECT
       COALESCE(
         b.book_name,
         (SELECT book_name FROM books WHERE book_id = cr.vid_destino / 1000000 LIMIT 1),
         'Libro ' || (cr.vid_destino / 1000000)
       ) AS book_name,
       cr.vid_destino / 1000000 AS book_id,
       (cr.vid_destino % 1000000) / 1000 AS chapter,
       cr.vid_destino % 1000 AS verse,
       COALESCE(v.text, '') AS text,
       cr.votos
     FROM cross_references cr
     LEFT JOIN verses v ON v.bible_id = ?
       AND v.book_id = cr.vid_destino / 1000000
       AND v.chapter = (cr.vid_destino % 1000000) / 1000
       AND v.verse = cr.vid_destino % 1000
     LEFT JOIN books b ON b.bible_id = ? AND b.book_id = cr.vid_destino / 1000000
     WHERE cr.vid_origen = ?
     ORDER BY cr.votos DESC
     LIMIT 100`,
    [bibleId, bibleId, vid],
  );
}
