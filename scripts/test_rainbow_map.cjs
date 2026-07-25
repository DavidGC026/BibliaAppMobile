/*
 * Comprobaciones del mapa de referencias (`lib/rainbowHtml.ts`) sobre jsdom.
 *
 *   npm i -D jsdom            # solo la primera vez
 *   node scripts/test_rainbow_map.cjs
 *
 * El HTML se genera con un payload sintético de 1189 capítulos (el tamaño
 * real de la Biblia) para que la geometría —y sobre todo el zoom mínimo y la
 * precisión del toque— se midan con las mismas cifras que en el dispositivo.
 *
 * Se ejecuta contra los DOS espejos (móvil y web) y se comprueba que sigan
 * siendo el mismo archivo, que es la única forma de que no se separen.
 */
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

let JSDOM
try {
  ;({ JSDOM } = require('jsdom'))
} catch {
  console.error('Falta jsdom. Instálalo con:  npm i -D jsdom')
  process.exit(1)
}

const jiti = loadJiti()
if (!jiti) {
  console.error('Falta jiti (npm i -D jiti) para cargar el TypeScript del módulo.')
  process.exit(1)
}

const MOBILE = path.resolve(__dirname, '../lib/rainbowHtml.ts')
const WEB = path.resolve(__dirname, '../../lib/rainbow-html.ts')

let failed = 0
function check(name, cond, extra) {
  if (cond) return console.log(`  ok   ${name}`)
  failed++
  console.log(`  FALLA ${name}${extra ? '\n         ' + extra : ''}`)
}

// ---- Payload sintético con la forma de la Biblia ----

const N_BOOKS = 66
const N_CHAPTERS = 1189
// [capítulo, arcos extra] — centros de citación con ventaja decreciente
const HUBS = [
  [542, 60],
  [117, 45],
  [918, 30],
]

function buildPayload() {
  const labels = []
  const bookIdx = []
  const bookNames = []
  const chap = []
  const perBook = Math.floor(N_CHAPTERS / N_BOOKS)
  let book = 0
  let inBook = 0
  for (let i = 0; i < N_CHAPTERS; i++) {
    if (inBook === perBook && book < N_BOOKS - 1) {
      book++
      inBook = 0
    }
    if (inBook === 0) bookNames.push(`Libro ${book + 1}`)
    inBook++
    labels.push(`Libro ${book + 1} ${inBook}`)
    bookIdx.push(book)
    chap.push(inBook)
  }
  // Arcos deterministas: suficientes para que el formato de miles se note.
  const arcs = []
  for (let a = 0; a < N_CHAPTERS; a += 1) {
    for (let k = 1; k <= 3; k++) {
      const b = (a * 7 + k * 91) % N_CHAPTERS
      if (b !== a) arcs.push(a, b, (k % 4) + 1)
    }
  }
  // El reparto anterior es casi uniforme, así que se plantan tres capítulos
  // muy citados con ventaja decreciente: son los que debe destacar el ranking.
  for (const [hub, extra] of HUBS) {
    for (let k = 0; k < extra; k++) {
      const b = (hub + 13 + k * 17) % N_CHAPTERS
      if (b !== hub) arcs.push(hub, b, 5)
    }
  }
  return { labels, bookIdx, bookNames, chap, arcs }
}

const PAYLOAD = buildPayload()
const TRIPLES = PAYLOAD.arcs.length / 3

const THEME = {
  dark: false,
  background: '#ffffff',
  text: '#111111',
  textMuted: '#666666',
  border: '#dddddd',
}

const VW = 412
const VH = 760

// ---- Entorno mínimo: jsdom no trae canvas ni layout ----

function fakeContext() {
  const noop = () => {}
  return {
    setTransform: noop,
    fillRect: noop,
    clearRect: noop,
    stroke: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    ellipse: noop,
    fillText: noop,
    measureText: (t) => ({ width: String(t).length * 5 }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
  }
}

function mount(html) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true })
  const { window } = dom

  window.HTMLCanvasElement.prototype.getContext = fakeContext
  window.devicePixelRatio = 2
  window.Path2D = class {
    moveTo() {}
    ellipse() {}
  }

  // Reloj controlable: el mapa distingue toque simple de doble toque por
  // tiempo, así que sin poder avanzarlo no se puede probar ninguno de los dos.
  let clock = 1_600_000_000_000
  window.Date = { now: () => clock }
  const advance = (ms) => {
    clock += ms
  }

  // Sin layout real, clientWidth/clientHeight son 0: se fija el tamaño de un
  // móvil para que la geometría sea la de verdad.
  const viewport = window.document.getElementById('viewport')
  Object.defineProperty(viewport, 'clientWidth', { value: VW, configurable: true })
  Object.defineProperty(viewport, 'clientHeight', { value: VH, configurable: true })

  // El script es una IIFE sin exportaciones: se le añade un mirador justo
  // antes del cierre para poder leer su estado interno.
  const source = window.document.querySelector('script').textContent
  const close = source.lastIndexOf('})();')
  if (close < 0) throw new Error('No se encontró el cierre de la IIFE del mapa')
  const hook = `
    window.__r = {
      state: function () {
        return {
          s: s, tx: tx, ty: ty, MINS: MINS, MAXS: MAXS, selected: selected,
          N: N, CSS_W: CSS_W, CSS_H: CSS_H, VW: VW, VH: VH, STEP: STEP, M: M
        };
      },
      tap: handleTap,
      setScale: setScale,
      setSelected: setSelected,
      counts: function () { return Array.prototype.slice.call(counts); }
    };
  `
  window.eval(source.slice(0, close) + hook + source.slice(close))
  return { window, doc: window.document, r: window.__r, advance }
}

// ---- Ejecución por espejo ----

function runVariant(name, modulePath) {
  console.log(`\n=== ${name} ===`)
  const mod = jiti(modulePath)
  const html = mod.getRainbowHtml(THEME, PAYLOAD, { connectionsButton: true })
  const { doc, r, advance } = mount(html)
  const st = r.state()

  console.log('\n1) Encuadre: la Biblia completa cabe en la pantalla')
  check('el lienzo es más ancho que la pantalla', st.CSS_W > st.VW, `CSS_W=${st.CSS_W} VW=${st.VW}`)
  check('el zoom mínimo baja de 1', st.MINS < 1, `MINS=${st.MINS}`)
  check(
    'a zoom mínimo cabe justo el ancho completo',
    Math.abs(st.CSS_W * st.MINS - st.VW) < 0.5,
    `CSS_W*MINS=${st.CSS_W * st.MINS} VW=${st.VW}`,
  )
  check('arranca encuadrado, no a 1x', Math.abs(st.s - st.MINS) < 1e-9, `s=${st.s}`)
  check('la etiqueta de zoom dice «Todo»', doc.getElementById('zoomLbl').textContent === 'Todo')

  console.log('\n2) Desplazamiento acotado')
  check('centrado en horizontal cuando cabe', Math.abs(st.tx) < 0.5, `tx=${st.tx}`)
  check(
    'anclado abajo, donde está la franja de libros',
    Math.abs(st.ty - (st.VH - st.CSS_H * st.s)) < 0.5,
    `ty=${st.ty}`,
  )
  {
    r.setScale(4, VW / 2, VH)
    const z = r.state()
    check('al ampliar ya no se centra', Math.abs(z.tx) > 0.5 || z.CSS_W * 4 <= z.VW)
    check('no se puede arrastrar más allá del borde', z.tx <= 0.001 && z.tx >= z.VW - z.CSS_W * 4 - 0.001)
    r.setScale(z.MINS, VW / 2, VH)
  }

  console.log('\n3) Límites de zoom')
  r.setScale(0.01, VW / 2, VH)
  check('no se puede alejar más que el encuadre', Math.abs(r.state().s - st.MINS) < 1e-9)
  r.setScale(999, VW / 2, VH)
  check('tope superior respetado', r.state().s === st.MINS * 1 || r.state().s === 8, `s=${r.state().s}`)
  r.setScale(st.MINS, VW / 2, VH)

  console.log('\n4) Selección: tocar acerca para poder ver y corregir')
  check('cada capítulo mide poco más de un pixel', st.STEP < 2, `STEP=${st.STEP}`)
  check('sin selección no hay clase «sel»', !doc.body.classList.contains('sel'))
  {
    const before = r.state()
    r.tap(VW / 2, VH / 2)
    const after = r.state()
    check('queda un capítulo seleccionado', after.selected >= 0, `selected=${after.selected}`)
    check('se acerca solo para que se vea cuál', after.s >= 2, `s=${after.s}`)
    check('la barra pasa a modo detalle', doc.body.classList.contains('sel'))
    check(
      'el capítulo elegido es el del punto tocado',
      Math.abs(after.selected - Math.round(((VW / 2 - before.tx) / before.s - before.M) / before.STEP)) <= 0,
      `selected=${after.selected}`,
    )
    check('la etiqueta muestra capítulo y conexiones', /conexiones/.test(doc.getElementById('infoText').textContent))
  }

  console.log('\n5) Paso capítulo a capítulo con ‹ ›')
  {
    const start = r.state().selected
    doc.getElementById('next').click()
    check('› avanza exactamente uno', r.state().selected === start + 1, `${start} -> ${r.state().selected}`)
    doc.getElementById('prev').click()
    check('‹ retrocede exactamente uno', r.state().selected === start, `-> ${r.state().selected}`)
    check('el capítulo queda centrado', Math.abs(r.state().s) >= 2.5 - 1e-9)
  }

  console.log('\n6) Doble toque y salidas de la selección')
  {
    // Segundo toque en el mismo punto antes de 300 ms: es un doble toque, así
    // que cambia el zoom y NO debe soltar la selección.
    const cur = r.state().selected
    const xOf = (i) => i * r.state().STEP + r.state().M
    const scr = xOf(cur) * r.state().s + r.state().tx
    r.tap(scr, VH / 2)
    check('doble toque no deselecciona', r.state().selected === cur, `selected=${r.state().selected}`)
    check('doble toque cambia el zoom', Math.abs(r.state().s - st.MINS) < 1e-9, `s=${r.state().s}`)

    // Pasado el umbral, el mismo punto sí suelta la selección.
    advance(500)
    const scr2 = xOf(cur) * r.state().s + r.state().tx
    r.tap(scr2, VH / 2)
    check('tras 300 ms, tocar el mismo capítulo lo suelta', r.state().selected === -1, `selected=${r.state().selected}`)
    check('la barra vuelve a modo descubrimiento', !doc.body.classList.contains('sel'))

    // Y siempre hay una salida explícita, sin depender del tiempo.
    advance(500)
    r.setSelected(300, true)
    doc.getElementById('clear').click()
    check('✕ quita la selección', r.state().selected === -1)
    check('✕ devuelve al modo descubrimiento', !doc.body.classList.contains('sel'))

    r.setScale(6, VW / 2, VH)
    doc.getElementById('zfit').click()
    check('⤢ devuelve al encuadre completo', Math.abs(r.state().s - st.MINS) < 1e-9, `s=${r.state().s}`)
  }

  console.log('\n7) Límites de los extremos')
  {
    r.setSelected(0, true)
    check('en el primer capítulo ‹ queda inhabilitado', doc.getElementById('prev').disabled === true)
    r.setSelected(N_CHAPTERS - 1, true)
    check('en el último › queda inhabilitado', doc.getElementById('next').disabled === true)
    r.setSelected(-1, false)
  }

  console.log('\n8) Cartel de progreso con la cifra real')
  {
    const txt = doc.getElementById('progTxt').textContent
    const expected = String(TRIPLES).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    check('no lleva una cifra fija inventada', !txt.includes('344.800'), txt)
    check(`dice los ${expected} arcos que se dibujan`, txt.includes(expected), txt)
  }

  console.log('\n9) Botón de conexiones según el anfitrión')
  check('con anfitrión, el botón existe', !!doc.getElementById('conns'))
  {
    const plain = mod.getRainbowHtml(THEME, PAYLOAD)
    check('sin anfitrión, no se ofrece un botón muerto', !plain.includes('id="conns"'))
  }

  console.log('\n10) Atajos a los capítulos más conectados')
  {
    const chips = [...doc.querySelectorAll('#chips .chip')]
    const counts = r.counts()
    const ranking = counts
      .map((n, i) => [n, i])
      .sort((a, b) => b[0] - a[0] || a[1] - b[1])
      .slice(0, 20)
    check('hay 20 atajos', chips.length === 20, `chips=${chips.length}`)
    check(
      'son los 20 capítulos más citados, en orden',
      chips.every((c, k) => c.textContent === PAYLOAD.labels[ranking[k][1]]),
      chips.slice(0, 3).map((c) => c.textContent).join(' | '),
    )
    check(
      'el primero tiene más conexiones que el último',
      counts[ranking[0][1]] > counts[ranking[19][1]],
      `${counts[ranking[0][1]]} vs ${counts[ranking[19][1]]}`,
    )
    check(
      'los tres primeros son los capítulos más citados del dato',
      chips.slice(0, 3).map((c) => c.textContent).join('|') ===
        HUBS.map(([h]) => PAYLOAD.labels[h]).join('|'),
      chips.slice(0, 3).map((c) => c.textContent).join('|'),
    )
    r.setSelected(-1, false)
    chips[3].click()
    check('tocar un atajo selecciona ese capítulo', r.state().selected === ranking[3][1])
    check('y lo acerca para poder verlo', r.state().s >= 2.5 - 1e-9, `s=${r.state().s}`)
    check('los atajos se ocultan al haber selección', doc.body.classList.contains('sel'))
    r.setSelected(-1, false)
  }

  console.log('\n11) Controles fuera del área de gestos')
  {
    const zoom = doc.getElementById('zoom')
    const legend = doc.getElementById('legend')
    const viewport = doc.getElementById('viewport')
    check('el zoom no está dentro del lienzo', !viewport.contains(zoom))
    check('la leyenda no está dentro del lienzo', !viewport.contains(legend))
    check('ambos viven en el escenario', zoom.parentElement.id === 'stage' && legend.parentElement.id === 'stage')
  }
}

console.log('\n0) Los dos espejos siguen siendo el mismo archivo')
{
  const strip = (p) =>
    fs
      .readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => !l.startsWith('// Espejo de') && l.trim() !== '// ponytail: mirror')
      .join('\n')
      .trim()
  check('mobile/lib/rainbowHtml.ts == lib/rainbow-html.ts', strip(MOBILE) === strip(WEB))
}

runVariant('móvil — mobile/lib/rainbowHtml.ts', MOBILE)
runVariant('web — lib/rainbow-html.ts', WEB)

console.log(failed ? `\n${failed} comprobación(es) FALLIDAS\n` : '\nTodo correcto\n')
process.exit(failed ? 1 : 0)
