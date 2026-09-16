/*
 * Comprobaciones de `lib/noteImageHtml.ts`: la parte pura del traslado de
 * imágenes base64 de las notas a URLs subidas.
 *
 *   node scripts/test_note_images.cjs
 *
 * No necesita Expo ni red: `noteImageHtml.ts` no importa nada, y aquí se
 * simula el subidor para comprobar también el flujo completo de sustitución.
 */
const path = require('path')

// jiti permite cargar el .ts directamente. Vive en node_modules de este
// proyecto o en el del repo web, que es el que suele estar instalado.
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

const jiti = loadJiti()
if (!jiti) {
  console.error('Falta jiti (npm i -D jiti) para cargar el TypeScript del módulo.')
  process.exit(1)
}

const img = jiti(path.resolve(__dirname, '../lib/noteImageHtml.ts'))

let failed = 0
function check(name, cond, extra) {
  if (cond) return console.log(`  ok   ${name}`)
  failed++
  console.log(`  FALLA ${name}${extra ? '\n         ' + extra : ''}`)
}

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ'
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
const block = (src, extra = '') =>
  `<div class="note-image-block" contenteditable="false"><img src="${src}" draggable="false"${extra} /></div>`

console.log('\n1) Detección de imágenes incrustadas')
check('nota con base64', img.hasEmbeddedImages(block(JPEG)) === true)
check('nota con URL', img.hasEmbeddedImages(block('https://x.test/uploads/a.jpg')) === false)
check('nota vacía', img.hasEmbeddedImages('') === false)
check('no revienta con undefined', img.hasEmbeddedImages(undefined) === false)

console.log('\n2) Recolección sin repetir y en orden')
{
  const html = `<p>a</p>${block(JPEG)}<p>b</p>${block(PNG)}${block(JPEG)}${block('https://x.test/u/c.png')}`
  const found = img.collectDataUriImages(html)
  check('dos imágenes únicas', found.length === 2, JSON.stringify(found.map((s) => s.slice(0, 24))))
  check('respeta el orden', found[0] === JPEG && found[1] === PNG)
  check('ignora las URLs', !found.some((s) => s.startsWith('http')))
}

console.log('\n3) Sustitución del src')
{
  const html = `<p>hola</p>${block(JPEG)}`
  const out = img.mapNoteImageSources(html, (src) => (src === JPEG ? 'https://x.test/uploads/a.jpg' : null))
  check('cambia el data: por la URL', out.includes('src="https://x.test/uploads/a.jpg"'))
  check('ya no queda base64', !img.hasEmbeddedImages(out))
  check('conserva el resto del tag', out.includes('draggable="false"'))
  check('conserva el bloque y el texto', out.includes('note-image-block') && out.includes('hola'))
}
{
  const out = img.mapNoteImageSources(block(JPEG), () => null)
  check('map que devuelve null no toca nada', out === block(JPEG))
}
{
  const html = `<img src='${JPEG}'>`
  const out = img.mapNoteImageSources(html, () => 'https://x.test/u/a.jpg')
  check('acepta comillas simples', out === "<img src='https://x.test/u/a.jpg'>")
}
{
  const out = img.mapNoteImageSources('<img alt="sin src">', () => 'https://x.test/u/a.jpg')
  check('img sin src se deja igual', out === '<img alt="sin src">')
}
{
  // Una URL con $1 no debe expandirse como grupo de captura.
  const out = img.mapNoteImageSources(block(JPEG), () => 'https://x.test/u/$1$2.jpg')
  check('escapa el $ del reemplazo', out.includes('src="https://x.test/u/$1$2.jpg"'))
}

console.log('\n4) Lectura del data: URI')
{
  const parsed = img.parseDataUri(JPEG)
  check('mime', parsed && parsed.mime === 'image/jpeg')
  check('base64 sin la cabecera', parsed && parsed.base64 === '/9j/4AAQSkZJRgABAQAAAQ')
  check('rechaza una URL normal', img.parseDataUri('https://x.test/a.jpg') === null)
  check('rechaza un data: sin datos', img.parseDataUri('data:image/png;base64,') === null)
  check('extensión jpg', img.extensionForMime('image/jpeg') === 'jpg')
  check('extensión png', img.extensionForMime('image/PNG') === 'png')
  check('mime desconocido cae en jpg', img.extensionForMime('image/raro') === 'jpg')
}

console.log('\n5) Hash: estable para los mismos bytes, distinto para otros')
check('estable', img.hashDataUri(JPEG) === img.hashDataUri(JPEG))
check('distingue imágenes', img.hashDataUri(JPEG) !== img.hashDataUri(PNG))
check('sin caracteres raros para SQLite', /^[0-9a-f]{8}-[0-9a-z]+$/.test(img.hashDataUri(JPEG)))

console.log('\n6) Flujo completo con un subidor simulado (idempotencia)')
{
  // Réplica de uploadEmbeddedNoteImages() con la caché y la red simuladas:
  // comprueba que la misma imagen no se sube dos veces aunque el DOM del
  // editor siga trayendo el base64 en cada autoguardado.
  const cache = new Map()
  let uploads = 0
  const upload = async (dataUri) => {
    const hash = img.hashDataUri(dataUri)
    if (cache.has(hash)) return cache.get(hash)
    uploads++
    const parsed = img.parseDataUri(dataUri)
    const url = `https://x.test/uploads/${hash}.${img.extensionForMime(parsed.mime)}`
    cache.set(hash, url)
    return url
  }
  const run = async (html) => {
    if (!img.hasEmbeddedImages(html)) return html
    const resolved = new Map()
    for (const dataUri of img.collectDataUriImages(html)) resolved.set(dataUri, await upload(dataUri))
    return img.mapNoteImageSources(html, (src) => resolved.get(src) ?? null)
  }

  const original = `<p>nota</p>${block(JPEG)}${block(PNG)}${block(JPEG)}`
  ;(async () => {
    const first = await run(original)
    check('sube una vez por imagen única', uploads === 2, `uploads=${uploads}`)
    check('sin base64 en el resultado', !img.hasEmbeddedImages(first))
    check('la imagen repetida usa la misma URL', first.split('.jpg"').length - 1 === 2)

    // Segundo autoguardado: el editor vuelve a mandar el HTML con base64.
    const second = await run(original)
    check('no vuelve a subir (caché por hash)', uploads === 2, `uploads=${uploads}`)
    check('mismo resultado', second === first)

    // Nota ya limpia: no se toca.
    const third = await run(first)
    check('contenido ya subido pasa de largo', third === first && uploads === 2)

    console.log(failed ? `\n${failed} comprobación(es) FALLIDAS\n` : '\nTodo correcto\n')
    process.exit(failed ? 1 : 0)
  })()
}
