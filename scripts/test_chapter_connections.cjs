/*
 * Comprueba la consulta de capítulos conectados (`lib/offline/chapterConnectionsQuery.ts`)
 * ejecutándola contra SQLite de verdad.
 *
 *   node scripts/test_chapter_connections.cjs
 *
 * No usa expo-sqlite: se ejecuta el MISMO texto de consulta que la app en un
 * sqlite3 de línea de órdenes sobre una base en memoria. El CLI no acepta
 * parámetros, así que se sustituyen los `?` por los valores que devuelve
 * chapterConnectionsParams(), que son todos enteros.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function loadJiti() {
  for (const id of ['jiti', path.resolve(__dirname, '../../node_modules/jiti')]) {
    try {
      return require(id)(__filename, { interopDefault: true })
    } catch {
      // se prueba la siguiente ubicación
    }
  }
  return null
}

function findSqlite3() {
  const candidates = [
    'sqlite3',
    '/usr/bin/sqlite3',
    '/opt/android-sdk/platform-tools/sqlite3',
  ]
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['-version'], { stdio: 'pipe' })
      return bin
    } catch {
      // se prueba el siguiente
    }
  }
  return null
}

const jiti = loadJiti()
if (!jiti) {
  console.error('Falta jiti (npm i -D jiti) para cargar el TypeScript del módulo.')
  process.exit(1)
}

const SQLITE = findSqlite3()
if (!SQLITE) {
  console.error('No se encontró sqlite3. Instálalo con:  apt install sqlite3')
  process.exit(1)
}

const q = jiti(path.resolve(__dirname, '../lib/offline/chapterConnectionsQuery.ts'))

let failed = 0
function check(name, cond, extra) {
  if (cond) return console.log(`  ok   ${name}`)
  failed++
  console.log(`  FALLA ${name}${extra ? '\n         ' + extra : ''}`)
}

// El esquema real de la app, tal cual está en lib/db.ts.
const SCHEMA_SOURCE = fs.readFileSync(path.resolve(__dirname, '../lib/db.ts'), 'utf8')
const SCHEMA = `
CREATE TABLE cross_references (
  vid_origen INTEGER NOT NULL,
  vid_destino INTEGER NOT NULL,
  votos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_crossrefs_origen ON cross_references(vid_origen);
CREATE INDEX idx_crossrefs_destino ON cross_references(vid_destino);
`

const vid = (book, chapter, verse) => book * 1000000 + chapter * 1000 + verse
const key = (book, chapter) => book * 1000 + chapter

// Génesis 1 (1|1) es el capítulo de partida en todas las pruebas.
const GEN1 = key(1, 1)

const ROWS = [
  // Génesis 1 cita a Juan 1 tres veces (sentido origen -> destino)
  [vid(1, 1, 1), vid(43, 1, 1), 10],
  [vid(1, 1, 1), vid(43, 1, 3), 5],
  [vid(1, 1, 3), vid(43, 1, 3), 1],
  // Hebreos 11 cita a Génesis 1 dos veces (sentido inverso: solo se ve
  // mirando vid_destino, que es justo lo que fallaba antes)
  [vid(58, 11, 3), vid(1, 1, 1), 7],
  [vid(58, 11, 3), vid(1, 1, 2), 2],
  // Salmos 33 cita a Génesis 1 una vez
  [vid(19, 33, 6), vid(1, 1, 3), 4],
  // Referencia dentro del propio capítulo: no es una conexión con otro
  [vid(1, 1, 1), vid(1, 1, 27), 3],
  // Ruido que no toca a Génesis 1
  [vid(40, 5, 3), vid(42, 6, 20), 9],
  [vid(1, 2, 4), vid(43, 1, 1), 6],
]

function runQuery(chapterKey, limit) {
  const params = q.chapterConnectionsParams(chapterKey, limit)
  let i = 0
  const sql = q.CHAPTER_CONNECTIONS_SQL.replace(/\?/g, () => String(params[i++]))
  if (i !== params.length) throw new Error(`la consulta usa ${i} parámetros y se pasaron ${params.length}`)

  const inserts = ROWS.map(
    ([o, d, v]) => `INSERT INTO cross_references VALUES (${o}, ${d}, ${v});`,
  ).join('\n')
  const script = `${SCHEMA}\n${inserts}\n.mode list\n.separator |\n${sql};\n`
  const out = execFileSync(SQLITE, [':memory:'], { input: script, encoding: 'utf8' })
  return out
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [k, refs, votes] = line.split('|')
      return q.toChapterConnection({ k: Number(k), refs: Number(refs), votes: votes === '' ? null : Number(votes) })
    })
}

console.log('\n1) El esquema de la app tiene el índice que necesita la consulta')
check(
  'idx_crossrefs_destino existe en lib/db.ts',
  SCHEMA_SOURCE.includes('idx_crossrefs_destino ON cross_references(vid_destino)'),
)
check('la consulta filtra por rangos y no divide la columna', !/vid_origen \/ 1000/.test(q.CHAPTER_CONNECTIONS_SQL))

console.log('\n1b) Con 344.000 filas, las dos ramas van por índice')
{
  const params = q.chapterConnectionsParams(GEN1, 80)
  let i = 0
  const sql = q.CHAPTER_CONNECTIONS_SQL.replace(/\?/g, () => String(params[i++]))
  const plan = execFileSync(SQLITE, [':memory:'], {
    input: `${SCHEMA}\nEXPLAIN QUERY PLAN ${sql};\n`,
    encoding: 'utf8',
  })
  check('busca por vid_origen con índice', /SEARCH cross_references USING INDEX idx_crossrefs_origen/.test(plan), plan)
  check('busca por vid_destino con índice', /SEARCH cross_references USING INDEX idx_crossrefs_destino/.test(plan), plan)
  check('no recorre la tabla entera', !/SCAN cross_references/.test(plan), plan)
}

console.log('\n2) Cuenta los dos sentidos')
const res = runQuery(GEN1, 80)
{
  const found = res.map((c) => `${c.bookId}:${c.chapter}=${c.refs}`)
  check('encuentra los capítulos citados y los que citan', res.length === 3, found.join(' '))
  const juan1 = res.find((c) => c.bookId === 43 && c.chapter === 1)
  const heb11 = res.find((c) => c.bookId === 58 && c.chapter === 11)
  const sal33 = res.find((c) => c.bookId === 19 && c.chapter === 33)
  check('Juan 1, citado por Génesis 1, aparece con 3 referencias', juan1 && juan1.refs === 3, JSON.stringify(juan1))
  check('Hebreos 11, que cita a Génesis 1, aparece con 2', heb11 && heb11.refs === 2, JSON.stringify(heb11))
  check('Salmos 33, que cita a Génesis 1, aparece con 1', sal33 && sal33.refs === 1, JSON.stringify(sal33))
  check('suma los votos de las dos direcciones', juan1 && juan1.votes === 16, JSON.stringify(juan1))
}

console.log('\n3) Orden y exclusiones')
check('el más citado va primero', res[0].bookId === 43 && res[0].chapter === 1, JSON.stringify(res[0]))
check('el menos citado va último', res[2].bookId === 19 && res[2].chapter === 33, JSON.stringify(res[2]))
check('no se incluye a sí mismo', !res.some((c) => c.key === GEN1))
check('no aparecen capítulos ajenos', !res.some((c) => c.bookId === 40 || c.bookId === 42))
check(
  'no se cuela Génesis 2 por tener referencias propias',
  !res.some((c) => c.bookId === 1 && c.chapter === 2),
)

console.log('\n4) Traducción de la clave a libro y capítulo')
{
  const juan1 = res.find((c) => c.bookId === 43)
  check('clave = libro*1000 + capítulo', juan1.key === key(43, 1), `key=${juan1.key}`)
  check('libro y capítulo se despejan bien', juan1.bookId === 43 && juan1.chapter === 1)
  const c = q.toChapterConnection({ k: key(66, 22), refs: 4, votes: null })
  check('votos nulos cuentan como cero', c.votes === 0)
  check('capítulos de tres cifras', q.toChapterConnection({ k: key(19, 119), refs: 1, votes: 1 }).chapter === 119)
}

console.log('\n5) El límite se respeta')
{
  const one = runQuery(GEN1, 1)
  check('con límite 1 vuelve solo el más citado', one.length === 1 && one[0].bookId === 43, JSON.stringify(one))
}

console.log('\n6) Un capítulo sin conexiones no da error')
{
  const none = runQuery(key(7, 21), 80)
  check('lista vacía', none.length === 0, JSON.stringify(none))
}

console.log(failed ? `\n${failed} comprobación(es) FALLIDAS\n` : '\nTodo correcto\n')
process.exit(failed ? 1 : 0)
