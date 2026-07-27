/*
 * Ida y vuelta del HTML de las notas por el esquema de Tiptap del movil.
 *
 *   node scripts/test_editor_roundtrip.cjs
 *
 * Dos partes:
 *
 *   1. El HTML real de una nota entra al esquema y sale sin perder nada, y la
 *      interfaz que la web guarda dentro del contenido (la barra de botones de
 *      los bloques) se queda fuera.
 *   2. El HTML limpio que produce Tiptap lo entiende el codigo que ya existe:
 *      se ejecuta `normalizeContentBlocks()` del editor de bloques del movil
 *      sobre la salida y se comprueba que reconstruye los envoltorios sin
 *      volver a meter interfaz.
 *
 * ponytail: espejo de desktop/src/lib/tiptap/__roundtrip__.ts
 */
const path = require('path')

let JSDOM
try {
  JSDOM = require('jsdom').JSDOM
} catch {
  console.error('Falta jsdom. Instalalo con:  npm i -D jsdom')
  process.exit(1)
}

// El DOM tiene que existir antes de importar nada de ProseMirror.
const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.Node = dom.window.Node
globalThis.Element = dom.window.Element
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.DocumentFragment = dom.window.DocumentFragment
globalThis.navigator = dom.window.navigator

const jiti = require('jiti')(__filename, {
  interopDefault: true,
  alias: { '@': path.resolve(__dirname, '..') },
})

const { getSchema } = jiti('@tiptap/core')
const { DOMParser, DOMSerializer } = jiti('@tiptap/pm/model')
const { buildNoteExtensions } = jiti(path.resolve(__dirname, '../lib/tiptap/extensions.ts'))
const blocks = jiti(path.resolve(__dirname, '../lib/noteEditorBlocks.ts'))
const table = jiti(path.resolve(__dirname, '../lib/noteEditorTable.ts'))

const schema = getSchema(buildNoteExtensions())
const parser = DOMParser.fromSchema(schema)
const serializer = DOMSerializer.fromSchema(schema)

function roundTrip(html) {
  const container = document.createElement('div')
  container.innerHTML = html
  const doc = parser.parse(container)
  const fragment = serializer.serializeFragment(doc.content)
  const out = document.createElement('div')
  out.appendChild(fragment)
  return out.innerHTML
}

/** Texto visible, para comparar contenido ignorando diferencias de marcado. */
function textOf(html) {
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

const HANDLE =
  '<div class="biblia-block-handle" contenteditable="false">' +
  '<div class="biblia-block-handle-row">' +
  '<span class="biblia-block-label">📖 Juan 3:16</span>' +
  '<div class="biblia-block-actions">' +
  '<button type="button" class="biblia-block-btn" data-block-action="up" contenteditable="false">↑</button>' +
  '<button type="button" class="biblia-block-btn" data-block-action="delete" contenteditable="false">Eliminar</button>' +
  '</div></div></div>'

const cases = [
  {
    name: 'Formato basico (negrita, cursiva, subrayado, listas)',
    html:
      '<p>Texto <strong>negrita</strong> e <em>cursiva</em> y <u>subrayado</u>.</p>' +
      '<ul><li><p>Primero</p></li><li><p>Segundo</p></li></ul>' +
      '<ol><li><p>Uno</p></li></ol>',
    expect: ['strong', 'em', 'u', 'ul li', 'ol li'],
  },
  {
    name: 'Encabezados',
    html: '<h1>Titulo</h1><h2>Subtitulo</h2><p>Cuerpo</p>',
    expect: ['h1', 'h2', 'p'],
  },
  {
    name: 'Color y tamano de letra del editor anterior',
    html: '<p><span style="color: #92700C; font-size: 20px">Texto dorado</span></p>',
    expect: ['span[style*="color"]', 'span[style*="font-size"]'],
  },
  {
    name: 'Versiculo con barra de botones guardada (formato de la web)',
    html:
      '<div class="biblia-content-block biblia-verse-block">' +
      HANDLE +
      '<blockquote class="biblia-verse-quote" contenteditable="false">' +
      '<strong>Juan 3:16 (RVR60)</strong><br/><strong>16</strong> Porque de tal manera amó Dios al mundo.' +
      '</blockquote></div><p><br></p>',
    expect: ['blockquote.biblia-verse-quote', 'blockquote strong'],
    reject: ['.biblia-block-handle', '[data-block-action]', 'button'],
  },
  {
    name: 'Diccionario Strong',
    html:
      '<div class="biblia-content-block biblia-dict-block">' +
      '<aside class="biblia-dict-entry" data-strong="H0430" contenteditable="false">' +
      '<span class="biblia-dict-lemma">אֱלֹהִים</span><p>Dios, dioses.</p>' +
      '</aside></div><p><br></p>',
    expect: ['aside.biblia-dict-entry', 'aside[data-strong]', '.biblia-dict-lemma'],
    reject: ['.biblia-block-handle'],
  },
  {
    name: 'Tabla con encabezado',
    html:
      '<div class="biblia-content-block biblia-table-block">' +
      '<table class="biblia-note-table"><thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>' +
      '<tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>' +
      '</div><p><br></p>',
    expect: ['table', 'th', 'td'],
    reject: ['.biblia-block-handle'],
  },
  {
    name: 'Imagen normal',
    html:
      '<div class="note-image-block" contenteditable="false" style="text-align: center; width: 60%; max-width: 100%; display: block; margin: 12px auto;">' +
      '<img src="https://biblia2.dvguzman.com/uploads/foto.webp" alt="Mi foto" draggable="false" style="width: 100%; height: auto; border-radius: 8px;" />' +
      '</div><p><br></p>',
    expect: [
      'div.note-image-block',
      'img[src="https://biblia2.dvguzman.com/uploads/foto.webp"]',
      'img[alt="Mi foto"]',
    ],
  },
  {
    name: 'Imagen de fondo posicionada',
    html:
      '<div class="note-image-block is-background" contenteditable="false" style="width: 45%; left: 120px; top: 80px; position: absolute; z-index: -1;">' +
      '<img src="/uploads/fondo.webp" alt="Fondo" draggable="false" />' +
      '</div><p>Texto encima</p>',
    expect: ['div.note-image-block.is-background', 'img[src="/uploads/fondo.webp"]'],
  },
  {
    name: 'Imagen suelta de una nota antigua se adopta',
    html: '<p>antes</p><img src="/uploads/suelta.webp" alt="Suelta" /><p>despues</p>',
    expect: ['div.note-image-block', 'img[src="/uploads/suelta.webp"]'],
  },
]

let passed = 0
let failed = 0

console.log('\n  Ida y vuelta del HTML de notas por el esquema de Tiptap\n')

for (const testCase of cases) {
  const out = roundTrip(testCase.html)
  const probe = document.createElement('div')
  probe.innerHTML = out

  const missing = testCase.expect.filter((sel) => !probe.querySelector(sel))
  const leaked = (testCase.reject ?? []).filter((sel) => probe.querySelector(sel))
  const handleWords = ['↑', '↓', '📖', 'Copiar', 'Cortar', 'Eliminar', 'Versículo', 'Juan 3:16']
  const normalize = (t) =>
    handleWords.reduce((acc, w) => acc.split(w).join(''), t).replace(/\s+/g, ' ').trim()
  const textLost = normalize(textOf(testCase.html)) !== normalize(textOf(out))

  if (missing.length === 0 && leaked.length === 0 && !textLost) {
    passed++
    console.log(`  OK    ${testCase.name}`)
  } else {
    failed++
    console.log(`  FALLA ${testCase.name}`)
    if (missing.length) console.log(`        falta: ${missing.join(', ')}`)
    if (leaked.length) console.log(`        se colo: ${leaked.join(', ')}`)
    if (textLost) {
      console.log(`        texto antes: ${normalize(textOf(testCase.html)).slice(0, 90)}`)
      console.log(`        texto despues: ${normalize(textOf(out)).slice(0, 90)}`)
    }
    console.log(`        salida: ${out.slice(0, 220)}`)
  }
}

console.log(`\n  ${passed} correctos, ${failed} fallidos\n`)

// ---------------------------------------------------------------------------
// Parte 2: lo que produce Tiptap lo entiende el editor de bloques del movil.
// ---------------------------------------------------------------------------

console.log('  El editor de bloques entiende lo que guarda Tiptap\n')

const HANDLE_SELECTORS = [
  '.biblia-block-handle',
  '[data-block-action]',
  '.biblia-block-btn',
  '.biblia-block-actions',
  '.biblia-block-label',
]

function normalizeWithMobileBlocks(html) {
  const win = new JSDOM('<div id="editor" contenteditable="true"></div>', {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  }).window
  win.document.getElementById('editor').innerHTML = html
  win.eval(`(function(){
    var editor = document.getElementById('editor');
    function notifyChange() {}
    function scrollCaretIntoView() {}
    ${blocks.getNoteBlockScript(false)}
    ${table.getNoteTableScript(false)}
    normalizeContentBlocks();
  })();`)
  return win.document.getElementById('editor')
}

const interop = [
  {
    name: 'Versiculo limpio recupera envoltorio, sin barra de botones',
    html: '<blockquote class="biblia-verse-quote"><strong>Juan 3:16</strong><br>Porque de tal manera…</blockquote>',
    expect: ['.biblia-content-block.biblia-verse-block', 'blockquote.biblia-verse-quote'],
  },
  {
    name: 'Tabla limpia recupera envoltorio, sin barra de botones',
    html: '<table class="biblia-note-table"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>',
    expect: ['.biblia-content-block.biblia-table-block', 'table'],
  },
  {
    name: 'Diccionario limpio recupera envoltorio, sin barra de botones',
    html: '<aside class="biblia-dict-entry" data-strong="H0430"><p>Dios</p></aside>',
    expect: ['.biblia-content-block.biblia-dict-block', 'aside.biblia-dict-entry'],
  },
  {
    name: 'Imagen limpia conserva su bloque',
    html: '<div class="note-image-block" style="width: 60%;"><img src="/uploads/a.webp" alt="a" /></div>',
    expect: ['div.note-image-block', 'img[src]'],
  },
  {
    name: 'Nota de la web con barra guardada: la barra no vuelve',
    html:
      '<div class="biblia-content-block biblia-verse-block">' +
      HANDLE +
      '<blockquote class="biblia-verse-quote">Texto del versículo</blockquote></div>',
    expect: ['.biblia-content-block.biblia-verse-block', 'blockquote.biblia-verse-quote'],
  },
]

let interopPassed = 0
let interopFailed = 0

for (const testCase of interop) {
  const host = normalizeWithMobileBlocks(roundTrip(testCase.html))
  const missing = testCase.expect.filter((sel) => !host.querySelector(sel))
  const leaked = HANDLE_SELECTORS.filter((sel) => host.querySelector(sel))
  if (missing.length === 0 && leaked.length === 0) {
    interopPassed++
    console.log(`  OK    ${testCase.name}`)
  } else {
    interopFailed++
    console.log(`  FALLA ${testCase.name}`)
    if (missing.length) console.log(`        falta: ${missing.join(', ')}`)
    if (leaked.length) console.log(`        interfaz dentro del contenido: ${leaked.join(', ')}`)
    console.log(`        salida: ${host.innerHTML.slice(0, 200)}`)
  }
}

console.log(`\n  ${interopPassed} correctos, ${interopFailed} fallidos\n`)
process.exit(failed === 0 && interopFailed === 0 ? 0 : 1)
