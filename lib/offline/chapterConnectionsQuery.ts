/**
 * Consulta de capítulos conectados, aparte del store para poder probarla
 * contra SQLite sin arrastrar Expo. Aquí no se importa nada.
 *
 * Las claves de capítulo son `book*1000 + chapter` y los identificadores de
 * versículo `book*1000000 + chapter*1000 + verse`, así que `vid / 1000` es la
 * clave del capítulo al que pertenece ese versículo.
 */

/** Un capítulo conectado con otro, ya agregado. `key` es book*1000+chapter. */
export interface ChapterConnection {
  key: number;
  bookId: number;
  chapter: number;
  /** Referencias entre ambos capítulos, contando los dos sentidos. */
  refs: number;
  votes: number;
}

export interface ChapterConnectionRow {
  k: number;
  refs: number;
  votes: number | null;
}

/**
 * Capítulos conectados con uno dado, de más citados a menos.
 *
 * Cuenta los dos sentidos: la tabla guarda cada referencia una sola vez, así
 * que mirar solo `vid_origen` deja fuera a quien cita a este capítulo y la
 * lista no cuadraría con los arcos del mapa, que usan los dos extremos.
 *
 * Se filtra por rangos de `vid` en vez de dividir la columna, para que ambas
 * ramas puedan usar los índices de `vid_origen` y `vid_destino`.
 */
export const CHAPTER_CONNECTIONS_SQL = `SELECT other / 1000 AS k, COUNT(*) AS refs, SUM(votos) AS votes
     FROM (
       SELECT vid_destino AS other, votos FROM cross_references
        WHERE vid_origen BETWEEN ? AND ?
       UNION ALL
       SELECT vid_origen AS other, votos FROM cross_references
        WHERE vid_destino BETWEEN ? AND ?
     )
     GROUP BY k
     HAVING k <> ?
     ORDER BY refs DESC, votes DESC, k ASC
     LIMIT ?`;

export function chapterConnectionsParams(key: number, limit: number): number[] {
  const lo = key * 1000;
  return [lo, lo + 999, lo, lo + 999, key, limit];
}

export function toChapterConnection(row: ChapterConnectionRow): ChapterConnection {
  return {
    key: row.k,
    bookId: Math.floor(row.k / 1000),
    chapter: row.k % 1000,
    refs: row.refs,
    votes: row.votes ?? 0,
  };
}
