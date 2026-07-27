/*
 * Comprobaciones del editor de notas del WebView: que el documento no lleve
 * interfaz dentro (barras de botones de los bloques) y que la pestaña
 * contextual de la barra exista y sea la que ofrece las acciones.
 *
 *   node scripts/test_note_context_tab.cjs
 *
 * No necesita Expo ni un DOM: se comprueba el HTML/JS generado. El script del
 * WebView se valida sintácticamente con `new Function`, que es donde se nota
 * un escape roto en los template literals (un `join('\n')` mal escapado parte
 * el script entero y deja la barra sin funcionar).
 *
 * El comportamiento (selección, reparación, acciones) se comprueba con jsdom
 * en `../../scripts/test_note_blocks.cjs`, que además cruza web y móvil.
 */
const path = require('path')

function loadJiti() {
  for (const id of ['jiti', path.resolve(__dirname, '../../node_modules/jiti')]) {
    try {
      return require(id)(__filename, {
        interopDefault: true,
        alias: { '@': path.resolve(__dirname, '..') },
      })
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

const { getEditorHtml } = jiti(path.resolve(__dirname, '../lib/editorHtml.ts'))
const { getNoteBlockCss, getNoteBlockScript } = jiti(path.resolve(__dirname, '../lib/noteEditorBlocks.ts'))

const COLORS = {
  text: '#111111',
  textMuted: '#666666',
  background: '#ffffff',
  card: '#ffffff',
  cardMuted: '#f5f5f5',
  border: '#e5e5e5',
  accent: '#eeeeee',
  primary: '#92700C',
  primarySoft: 'rgba(146,112,12,0.12)',
  primaryBorder: 'rgba(146,112,12,0.35)',
  primaryForeground: '#ffffff',
  danger: '#dc2626',
}

let failed = 0
function check(name, cond, extra) {
  if (cond) return console.log(`  ok   ${name}`)
  failed++
  console.log(`  FALLA ${name}${extra ? '\n         ' + extra : ''}`)
}

function scriptBody(html) {
  const open = html.indexOf('<script>')
  const close = html.lastIndexOf('</script>')
  if (open === -1 || close === -1) return null
  return html.slice(open + '<script>'.length, close)
}

const editHtml = getEditorHtml(COLORS, '<p>Hola</p>', 'Default', {}, false, ['#92700C'])
const readOnlyHtml = getEditorHtml(COLORS, '<p>Hola</p>', 'Default', {}, true, ['#92700C'])

console.log('\n  El documento no contiene interfaz\n')

const editScript = getNoteBlockScript(false)
check(
  'los constructores de bloque no generan barra de botones',
  !editScript.includes('biblia-block-handle"') && !editScript.includes('data-block-action="'),
)
check(
  'existe stripBlockHandles y lo usa la normalización',
  editScript.includes('function stripBlockHandles(root)') &&
    /var changed = stripBlockHandles\(editor\)/.test(editScript),
)
check(
  'el CSS oculta la barra que pueda traer una nota de la web',
  /\.biblia-block-handle,\s*\n\s*\[data-block-action\] \{\s*\n\s*display: none !important;/.test(
    getNoteBlockCss(COLORS, false),
  ),
)
check(
  'el borde de la selección va reservado transparente (no desplaza el contenido)',
  getNoteBlockCss(COLORS, false).includes('border: 2px solid transparent'),
)
check(
  'en solo lectura tampoco se ve interfaz',
  getNoteBlockCss(COLORS, true).includes('[data-block-action] { display: none !important; }'),
)

console.log('\n  Pestaña contextual de la barra\n')

check('la fila contextual está en la barra', editHtml.includes('<div class="ctx-row" id="ctx-row">'))
check(
  'la selección de un bloque llega a la barra',
  editScript.includes('onContentBlockSelection(') &&
    editHtml.includes('function onContentBlockSelection(info)'),
)
check(
  'la barra puede actuar sobre lo seleccionado',
  editScript.includes('function runSelectedContentBlockAction(action)') &&
    editHtml.includes('runSelectedContentBlockAction(action)'),
)
check(
  'las acciones ofrecidas son las comunes más las del tipo',
  /actions: GENERIC_BLOCK_ACTIONS\.concat\(type\.actions \|\| \[\]\)/.test(editScript),
)
check(
  'la tabla aporta filas y columnas a su pestaña',
  editHtml.includes("{ action: 'table-row-add', label: '+ Fila' }") &&
    editHtml.includes("{ action: 'table-col-del', label: '− Col' }"),
)
check(
  'los botones de la pestaña no roban el foco (bindToolbarButton)',
  /bindToolbarButton\(btn, function\(\) \{\s*\n\s*runSelectedContentBlockAction\(action\);/.test(editHtml),
)
check('en solo lectura no hay pestaña contextual visible', readOnlyHtml.includes('.toolbar-area {\n      display: none'))

console.log('\n  El script del WebView es válido\n')

for (const [name, html] of [['edición', editHtml], ['solo lectura', readOnlyHtml]]) {
  const body = scriptBody(html)
  if (!body) {
    check(`se encuentra el script (${name})`, false)
    continue
  }
  let error = null
  try {
    new Function(body)
  } catch (e) {
    error = e.message
  }
  check(`el script se parsea sin errores (${name})`, error === null, error)
}

console.log('')
if (failed > 0) {
  console.log(`  ${failed} fallidos\n`)
  process.exit(1)
}
console.log('  todo correcto\n')
