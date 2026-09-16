#!/usr/bin/env node
/*
 * Prueba de la regla que decide el alto del teclado (`hooks/keyboardInsetState.ts`).
 *
 *   node scripts/test_keyboard_inset.cjs
 *
 * Por qué existe: el fallo de esa regla no se ve mirando el valor, se ve
 * mirando la **secuencia de eventos** que manda Android, y ahí se ha escondido
 * tres veces (docs móviles 34, 37 y 39). La última costó que la nota se quedara
 * a media pantalla al bajar el teclado, en producción.
 *
 * Aquí se reproduce esa secuencia tal y como la emite Reanimated, leyendo su
 * propio código nativo (`android/src/main/java/com/swmansion/reanimated/keyboard/`):
 *
 *   onStart     cambia el estado (OPENING / CLOSING) y NO toca el alto
 *   onProgress  mueve el alto, un aviso por fotograma, con ese mismo estado
 *   onEnd       cambia el estado (OPEN / CLOSED) y tampoco toca el alto
 *
 * De ahí sale la trampa: al cerrarse, el último `onProgress` ya trae el cero, y
 * el `onEnd` que de verdad importa trae ese mismo cero. Quien compare con el
 * fotograma anterior en vez de con el último valor publicado, lo descarta.
 *
 * Y como los avisos pueden llegar juntos o sueltos según cómo caiga el
 * fotograma, se prueban las dos formas: una pasada por aviso, y los dos últimos
 * avisos fundidos en una sola pasada.
 */
const path = require('path')

const jiti = require('jiti')(__filename, {
  interopDefault: true,
  alias: { '@': path.resolve(__dirname, '..') },
})
const { insetToPublish, KEYBOARD_OPEN, KEYBOARD_CLOSED } = jiti(
  path.resolve(__dirname, '../hooks/keyboardInsetState.ts'),
)

const OPENING = 1
const CLOSING = 3
const ALTO = 980

let failed = 0
function check(name, cond, extra) {
  if (cond) return console.log(`  ok   ${name}`)
  failed++
  console.log(`  FALLA ${name}${extra !== undefined ? '\n         ' + extra : ''}`)
}

/** Los avisos que emite Reanimated al abrirse o cerrarse el teclado. */
function avisos(abriendo) {
  const estado = abriendo ? OPENING : CLOSING
  const alturas = abriendo ? [200, 520, 800, ALTO] : [800, 520, 200, 0]
  return [
    // onStart: cambia el estado, el alto sigue siendo el de antes.
    { height: abriendo ? 0 : ALTO, state: estado },
    ...alturas.map((height) => ({ height, state: estado })),
    // onEnd: solo el estado, con el alto que dejó el último fotograma.
    { height: abriendo ? ALTO : 0, state: abriendo ? KEYBOARD_OPEN : KEYBOARD_CLOSED },
  ]
}

/**
 * Corre la regla sobre una secuencia.
 *
 * `fundirFinal` junta los dos últimos avisos en una sola pasada, que es lo que
 * pasa cuando el último `onProgress` y el `onEnd` caen en el mismo fotograma:
 * las reacciones de Reanimated se agrupan por fotograma, así que la pasada solo
 * ve el estado final.
 */
function correr(secuencia, fundirFinal) {
  const pasadas = fundirFinal ? [...secuencia.slice(0, -2), secuencia[secuencia.length - 1]] : secuencia
  let publicado = 0
  for (const frame of pasadas) {
    const next = insetToPublish(frame, publicado)
    if (next !== null) publicado = next
  }
  return publicado
}

console.log('\n  El alto del teclado, sobre la secuencia real de Reanimated\n')

for (const fundirFinal of [false, true]) {
  const como = fundirFinal ? 'con el último fotograma y el final juntos' : 'con una pasada por aviso'
  const abierto = correr(avisos(true), fundirFinal)
  check(`al abrirse publica el alto del teclado (${como})`, abierto === ALTO, abierto)

  let publicado = abierto
  for (const frame of avisos(false)) {
    const next = insetToPublish(frame, publicado)
    if (next !== null) publicado = next
  }
  check(`y al cerrarse vuelve a cero (${como})`, publicado === 0, publicado)
}

console.log('\n  Detalles de la regla\n')

check(
  'la animación no publica nada: el WebView no se remaqueta 60 veces por segundo',
  avisos(true)
    .filter((frame) => frame.state === OPENING)
    .every((frame) => insetToPublish(frame, 0) === null),
)

check(
  'cerrado es cero aunque el aviso traiga otro alto',
  insetToPublish({ height: 320, state: KEYBOARD_CLOSED }, 320) === 0,
)

check(
  'no repite un alto ya publicado',
  insetToPublish({ height: ALTO, state: KEYBOARD_OPEN }, ALTO) === null,
)

check(
  'un teclado que cambia de alto sin cerrarse sí se publica',
  insetToPublish({ height: 1120, state: KEYBOARD_OPEN }, ALTO) === 1120,
)

// Los estados van a mano para que esta prueba no arrastre Reanimated entero.
const { KeyboardState } = require('react-native-reanimated/lib/module/commonTypes.js')
check(
  'los estados siguen coincidiendo con los de Reanimated',
  KeyboardState.OPEN === KEYBOARD_OPEN && KeyboardState.CLOSED === KEYBOARD_CLOSED,
  `Reanimated: OPEN=${KeyboardState.OPEN} CLOSED=${KeyboardState.CLOSED}`,
)

console.log(failed === 0 ? '\n  Todo correcto\n' : `\n  ${failed} fallo(s)\n`)
process.exit(failed === 0 ? 0 : 1)
