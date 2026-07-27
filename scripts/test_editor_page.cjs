/*
 * Prueba de integración de la página del editor: se monta el HTML real que
 * recibe el WebView —con su bundle— dentro de jsdom y se acciona como lo haría
 * React Native.
 *
 *   node scripts/build_editor_bundle.mjs   # si se tocó lib/tiptap
 *   node scripts/test_editor_page.cjs
 *
 * Es la prueba que no puede hacer TypeScript: comprueba que el editor arranca
 * de verdad, que la cinta se dibuja, que las pestañas contextuales aparecen al
 * seleccionar y que el puente de mensajes responde.
 */
const path = require('path')

let JSDOM
let VirtualConsole
try {
  ;({ JSDOM, VirtualConsole } = require('jsdom'))
} catch {
  console.error('Falta jsdom. Instalalo con:  npm i -D jsdom')
  process.exit(1)
}

const jiti = require('jiti')(__filename, {
  interopDefault: true,
  alias: { '@': path.resolve(__dirname, '..') },
})
const { getEditorHtml } = jiti(path.resolve(__dirname, '../lib/editorHtml.ts'))
const { imageDragScrollStep } = jiti(path.resolve(__dirname, '../lib/tiptap/editor/imageCommands.ts'))

const COLORS = {
  text: '#111111',
  textMuted: '#666666',
  background: '#ffffff',
  card: '#ffffff',
  cardMuted: '#f5f5f5',
  muted: '#eeeeee',
  border: '#e5e5e5',
  accent: '#eeeeee',
  primary: '#92700C',
  primarySoft: 'rgba(146,112,12,0.12)',
  primaryBorder: 'rgba(146,112,12,0.35)',
  primaryForeground: '#ffffff',
  danger: '#dc2626',
}

const VERSE =
  '<blockquote class="biblia-verse-quote"><strong>Juan 3:16</strong><br>Porque de tal manera…</blockquote>'
const NOTE = `<p>Primera linea</p>${VERSE}<p>Ultima linea</p>`

let failed = 0
function check(name, cond, extra) {
  if (cond) return console.log(`  ok   ${name}`)
  failed++
  console.log(`  FALLA ${name}${extra ? '\n         ' + extra : ''}`)
}

function mount(content) {
  const html = getEditorHtml(COLORS, content, 'Default', {}, false, ['#92700C', '#EF4444'])
  const messages = []
  // El puente se inyecta antes de que corra la página, como hace el WebView.
  // jsdom no maqueta, así que ProseMirror falla al medir la selección para
  // desplazarla. Es ruido del entorno de pruebas, no del editor: se silencia
  // ese error concreto y se deja pasar cualquier otro.
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', (error) => {
    if (!/getClientRects/.test(error.message)) console.error(error.message)
  })
  virtualConsole.on('error', (...args) => console.error(...args))

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.ReactNativeWebView = { postMessage: (raw) => messages.push(JSON.parse(raw)) }
      // jsdom no maqueta: ProseMirror mide la selección para desplazarla y los
      // nodos de texto no tienen getClientRects. Se devuelve una caja vacía,
      // que es lo que hace un navegador con un nodo sin dibujar todavía.
      const emptyRect = { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }
      window.Text.prototype.getClientRects = () => []
      window.Text.prototype.getBoundingClientRect = () => emptyRect
      window.Element.prototype.getClientRects = () => []
    },
  })
  return { window: dom.window, document: dom.window.document, messages }
}

function send(window, action) {
  window.handleAction(JSON.stringify(action))
}

function dispatchPointer(window, target, type, { pointerId = 1, clientX = 0, clientY = 0 }) {
  const event = new window.Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  })
  target.dispatchEvent(event)
}

function tabLabels(document) {
  return Array.from(document.querySelectorAll('.ribbon-tab')).map((tab) => tab.textContent)
}

function groupLabels(document) {
  return Array.from(document.querySelectorAll('.ribbon-group-label')).map((el) => el.textContent)
}

/** Coloca la selección sobre el nodo de nivel superior número `index`. */
function selectTopLevelNode(window, index) {
  const editor = window.__noteEditor
  let pos = 0
  for (let i = 0; i < index; i++) pos += editor.state.doc.child(i).nodeSize
  editor.commands.setNodeSelection(pos)
}

console.log('\n  La página del editor arranca\n')

const app = mount(NOTE)
check('el bundle se ejecuta sin errores', typeof app.window.handleAction === 'function')
check('Tiptap monta el documento', !!app.document.querySelector('#editor .ProseMirror'))
check(
  'la nota se carga con su contenido',
  /Primera linea/.test(app.document.querySelector('#editor').textContent) &&
    !!app.document.querySelector('blockquote.biblia-verse-quote'),
)
check('avisa de que está listo', app.messages.some((message) => message.type === 'editorReady'))

console.log('\n  La cinta\n')

check(
  'pestañas fijas Inicio e Insertar',
  tabLabels(app.document).slice(0, 2).join(',') === 'Inicio,Insertar',
  tabLabels(app.document).join(','),
)
check('sin selección no hay pestaña contextual', !app.document.querySelector('.ribbon-tab.is-contextual'))
check(
  'las pestañas fijas tienen iconos SVG',
  Array.from(app.document.querySelectorAll('.ribbon-tab')).every((tab) => !!tab.querySelector('svg.ribbon-icon')),
)
check(
  'Inicio trae los grupos de formato',
  ['Deshacer', 'Estilos', 'Fuente', 'Formato', 'Párrafo', 'Color'].every((label) =>
    groupLabels(app.document).includes(label),
  ),
  groupLabels(app.document).join(','),
)
check('la paleta de colores usa los favoritos', app.document.querySelectorAll('.ribbon-colors .color-dot').length === 4)
check(
  'las acciones de formato usan iconos en vez de glifos Unicode',
  ['Deshacer', 'Rehacer', 'Negrita', 'Cursiva', 'Subrayado', 'Tachado'].every(
    (label) => !!app.document.querySelector(`.ribbon-btn[aria-label="${label}"] svg.ribbon-icon`),
  ),
)
check(
  'H1 y H2 tienen jerarquía tipográfica propia',
  !!app.document.querySelector('.ribbon-btn.is-heading-1') &&
    !!app.document.querySelector('.ribbon-btn.is-heading-2'),
)

console.log('\n  Pestañas contextuales\n')

selectTopLevelNode(app.window, 1)
check(
  'seleccionar el versículo abre su pestaña',
  tabLabels(app.document).includes('Formato de versículo'),
  tabLabels(app.document).join(','),
)
check(
  'y se activa sola',
  app.document.querySelector('.ribbon-tab.is-active')?.textContent === 'Formato de versículo',
)
check(
  'la pestaña contextual identifica el tipo con un icono',
  !!app.document.querySelector('.ribbon-tab.is-contextual svg.ribbon-icon'),
)
check(
  'con las acciones del bloque',
  ['Orden', 'Portapapeles', 'Bloque'].every((label) => groupLabels(app.document).includes(label)),
  groupLabels(app.document).join(','),
)
check('el documento no muestra ningún control', app.document.querySelectorAll('#editor button').length === 0)

console.log('\n  Acciones sobre el bloque seleccionado\n')

const orderGroup = Array.from(app.document.querySelectorAll('.ribbon-group')).find(
  (group) => group.querySelector('.ribbon-group-label')?.textContent === 'Orden',
)
orderGroup.querySelectorAll('.ribbon-btn')[0].dispatchEvent(new app.window.Event('click'))
check(
  'subir mueve el versículo por delante del párrafo',
  app.window.__noteEditor.state.doc.child(0).type.name === 'verseBlock',
  app.window.__noteEditor.state.doc.child(0).type.name,
)
check('la pestaña sigue abierta tras mover', tabLabels(app.document).includes('Formato de versículo'))

const blockGroup = Array.from(app.document.querySelectorAll('.ribbon-group')).find(
  (group) => group.querySelector('.ribbon-group-label')?.textContent === 'Bloque',
)
blockGroup.querySelectorAll('.ribbon-btn')[0].dispatchEvent(new app.window.Event('click'))
check(
  'eliminar quita el versículo',
  !app.document.querySelector('blockquote.biblia-verse-quote'),
)
check('y la pestaña contextual se cierra', !tabLabels(app.document).includes('Formato de versículo'))

console.log('\n  Puente con React Native\n')

const bridge = mount('<p>Hola</p>')
bridge.messages.length = 0

send(bridge.window, { type: 'getHtml' })
const response = bridge.messages.find((message) => message.type === 'getHtmlResponse')
check('getHtml responde con el HTML de la nota', !!response && /<p>Hola<\/p>/.test(response.html), response?.html)

send(bridge.window, { type: 'insertVerse', value: '<strong>Juan 1:1</strong><br/>En el principio…' })
send(bridge.window, { type: 'getHtml' })
const withVerse = bridge.messages.filter((message) => message.type === 'getHtmlResponse').pop()
check(
  'insertVerse mete un versículo del esquema',
  /<blockquote class="biblia-verse-quote">/.test(withVerse.html) && /Juan 1:1/.test(withVerse.html),
  withVerse.html,
)
check(
  'y no guarda ninguna barra de botones dentro',
  !/biblia-block-handle|data-block-action/.test(withVerse.html),
)

send(bridge.window, { type: 'insertImage', value: 'https://ejemplo/foto.webp' })
send(bridge.window, { type: 'getHtml' })
const withImage = bridge.messages.filter((message) => message.type === 'getHtmlResponse').pop()
check(
  'insertImage usa el bloque canónico del móvil',
  /class="note-image-block"/.test(withImage.html) && /src="https:\/\/ejemplo\/foto.webp"/.test(withImage.html),
  withImage.html,
)

send(bridge.window, { type: 'updateContent', value: '<h1>Otro contenido</h1>' })
send(bridge.window, { type: 'getHtml' })
const replaced = bridge.messages.filter((message) => message.type === 'getHtmlResponse').pop()
check('updateContent reemplaza la nota', /<h1>Otro contenido<\/h1>/.test(replaced.html), replaced.html)

send(bridge.window, { type: 'setFont', value: 'serif' })
check(
  'setFont cambia la tipografía de la nota',
  bridge.document.getElementById('editor').style.fontFamily.includes('serif'),
)

check(
  'la página se ajusta al alto que de verdad se ve',
  bridge.document.documentElement.style.getPropertyValue('--app-height') ===
    `${Math.round(bridge.window.innerHeight)}px`,
  bridge.document.documentElement.style.getPropertyValue('--app-height'),
)
bridge.window.innerHeight = 420
bridge.window.dispatchEvent(new bridge.window.Event('resize'))
check(
  'y vuelve a medirse cuando el viewport cambia',
  bridge.document.documentElement.style.getPropertyValue('--app-height') === '420px',
  bridge.document.documentElement.style.getPropertyValue('--app-height'),
)

send(bridge.window, { type: 'setKeyboardInset', value: 320, covered: 28 })
check(
  'el teclado que tapa parte del WebView encoge la página',
  bridge.document.documentElement.style.getPropertyValue('--kb-cover') === '28px',
  bridge.document.documentElement.style.getPropertyValue('--kb-cover'),
)
send(bridge.window, { type: 'setKeyboardInset', value: 0, covered: 0 })
check(
  'y al cerrarse recupera todo el alto',
  bridge.document.documentElement.style.getPropertyValue('--kb-cover') === '0px',
  bridge.document.documentElement.style.getPropertyValue('--kb-cover'),
)

const opened = []
bridge.window.ReactNativeWebView.postMessage = (raw) => opened.push(JSON.parse(raw))
const insertTab = Array.from(bridge.document.querySelectorAll('.ribbon-tab')).find(
  (tab) => tab.textContent === 'Insertar',
)
insertTab.dispatchEvent(new bridge.window.Event('click'))
const verseButton = Array.from(bridge.document.querySelectorAll('.ribbon-btn')).find(
  (button) => button.textContent === 'Versículo',
)
verseButton.dispatchEvent(new bridge.window.Event('click'))
const backgroundButton = Array.from(bridge.document.querySelectorAll('.ribbon-btn')).find(
  (button) => button.textContent === 'Modo fondos',
)
backgroundButton.dispatchEvent(new bridge.window.Event('click'))
check(
  'el modo fondos eleva las imágenes de detrás del texto',
  bridge.document.body.classList.contains('image-selection-mode'),
)
backgroundButton.dispatchEvent(new bridge.window.Event('click'))
check('y se puede volver a apagar', !bridge.document.body.classList.contains('image-selection-mode'))

check(
  'Insertar → Versículo se lo pide a React Native',
  opened.some((message) => message.type === 'openVerseModal'),
  JSON.stringify(opened),
)

console.log('\n  Imágenes de fondo\n')

check('arrastrar junto al borde superior desplaza hacia arriba', imageDragScrollStep(4, 0, 400) < 0)
check('arrastrar en el centro no desplaza la nota', imageDragScrollStep(200, 0, 400) === 0)
check('arrastrar junto al borde inferior desplaza hacia abajo', imageDragScrollStep(396, 0, 400) > 0)

const imageEditor = mount(
  '<p>Texto por encima</p>' +
    '<div class="note-image-block" style="width: 60%; text-align: center">' +
    '<img src="/uploads/fondo.webp" alt="Fondo" /></div>' +
    '<p>Texto por debajo</p>',
)
selectTopLevelNode(imageEditor.window, 1)
const sendBehind = Array.from(imageEditor.document.querySelectorAll('.ribbon-btn')).find(
  (button) => button.textContent === 'Detrás del texto',
)
sendBehind.dispatchEvent(new imageEditor.window.Event('click'))
check(
  'convertir una imagen en fondo activa su modo de colocación',
  imageEditor.document.body.classList.contains('image-selection-mode'),
)
check(
  'la imagen se eleva mientras se coloca',
  imageEditor.window.getComputedStyle(imageEditor.document.querySelector('.note-image-block')).zIndex === '10',
  imageEditor.window.getComputedStyle(imageEditor.document.querySelector('.note-image-block')).zIndex,
)
const finishBackground = Array.from(imageEditor.document.querySelectorAll('.ribbon-btn')).find(
  (button) => button.textContent === 'Finalizar fondo',
)
finishBackground.dispatchEvent(new imageEditor.window.Event('click'))
check(
  'Finalizar fondo apaga el modo temporal',
  !imageEditor.document.body.classList.contains('image-selection-mode'),
)
check(
  'y devuelve la imagen detrás del texto sin cambiar de vista',
  imageEditor.window.getComputedStyle(imageEditor.document.querySelector('.note-image-block')).zIndex === '0',
  imageEditor.window.getComputedStyle(imageEditor.document.querySelector('.note-image-block')).zIndex,
)
check('al finalizar se cierra la pestaña contextual', !imageEditor.document.querySelector('.ribbon-tab.is-contextual'))

const flowEditor = mount(
  '<div class="note-image-block" style="width: 60%; text-align: center">' +
    '<img src="/uploads/normal.webp" alt="Normal" /></div>' +
    '<p>Primer párrafo</p>' + VERSE,
)
const flowHost = flowEditor.document.getElementById('editor')
const flowImage = flowEditor.document.querySelector('.note-image-block')
const flowParagraph = flowEditor.document.querySelector('.ProseMirror > p')
const flowVerse = flowEditor.document.querySelector('.ProseMirror > .biblia-verse-quote')
flowHost.getBoundingClientRect = () => ({ top: 0, bottom: 400, left: 0, right: 320, width: 320, height: 400 })
flowImage.getBoundingClientRect = () => ({ top: 20, bottom: 100, left: 20, right: 220, width: 200, height: 80 })
flowParagraph.getBoundingClientRect = () => ({ top: 120, bottom: 160, left: 20, right: 300, width: 280, height: 40 })
flowVerse.getBoundingClientRect = () => ({ top: 180, bottom: 220, left: 20, right: 300, width: 280, height: 40 })
Object.defineProperties(flowHost, {
  clientHeight: { value: 400, configurable: true },
  scrollHeight: { value: 900, configurable: true },
})
flowHost.scrollTop = 0
dispatchPointer(flowEditor.window, flowImage, 'pointerdown', { clientX: 100, clientY: 60 })
check('seleccionar una imagen superior no manda la nota al final', flowHost.scrollTop === 0, String(flowHost.scrollTop))
dispatchPointer(flowEditor.window, flowImage, 'pointermove', { clientX: 100, clientY: 205 })
const dropIndicator = flowEditor.document.querySelector('.image-drop-indicator')
check(
  'el arrastre normal marca dónde se insertará la imagen',
  dropIndicator.classList.contains('is-visible') && dropIndicator.textContent === 'Colocar debajo de versículo',
  dropIndicator.textContent,
)
check('el indicador apunta al hueco posterior al último bloque', dropIndicator.dataset.insertionIndex === '3')
dispatchPointer(flowEditor.window, flowImage, 'pointerup', { clientX: 100, clientY: 205 })
check(
  'una imagen normal se puede arrastrar para reordenarla',
  flowEditor.window.__noteEditor.state.doc.child(2).type.name === 'imageBlock',
  flowEditor.window.__noteEditor.state.doc.toString(),
)
check('al soltar desaparece el indicador de inserción', !dropIndicator.classList.contains('is-visible'))

console.log('\n  La vista de solo lectura\n')

const readOnlyHtml = getEditorHtml(
  COLORS,
  `<p>Cuerpo</p><table class="biblia-note-table"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>`,
  'Default',
  {},
  true,
)
const readOnly = new JSDOM(readOnlyHtml, { runScripts: 'dangerously', pretendToBeVisual: true })
check('no carga el editor', !readOnlyHtml.includes('__NOTE_BOOT__'))
check('ni la cinta', !readOnly.window.document.querySelector('#ribbon'))
check('muestra el contenido', /Cuerpo/.test(readOnly.window.document.getElementById('editor').textContent))
check(
  'la tabla se compacta y se puede abrir',
  !!readOnly.window.document.querySelector('.biblia-table-widget .biblia-table-compact') &&
    !!readOnly.window.document.querySelector('#biblia-table-overlay'),
)

console.log('')
if (failed > 0) {
  console.log(`  ${failed} fallidos\n`)
  process.exit(1)
}
console.log('  todo correcto\n')
