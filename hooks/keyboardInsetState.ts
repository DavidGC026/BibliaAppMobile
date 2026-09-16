/**
 * La decisión de qué alto de teclado publicar, separada del hook a propósito.
 *
 * No es una función que merezca su propio archivo por tamaño, sino por dónde se
 * esconde el fallo: no está en el valor, está en la **secuencia de eventos** que
 * manda el sistema, y ahí ya se ha escondido tres veces (docs móviles 34, 37 y
 * 39). Aquí es una función pura sobre esa secuencia, así que
 * `scripts/test_keyboard_inset.cjs` puede reproducirla entera en node.
 *
 * Los estados van como números y no como el enum `KeyboardState` de Reanimated
 * para no arrastrar la librería —ni React Native— a la prueba. Que sigan
 * coincidiendo lo comprueba esa misma prueba.
 */

/** `KeyboardState.OPEN` de Reanimated. */
export const KEYBOARD_OPEN = 2
/** `KeyboardState.CLOSED` de Reanimated. */
export const KEYBOARD_CLOSED = 4

/** Una pasada de la reacción: el alto y el estado del teclado en ese momento. */
export type KeyboardFrame = { height: number; state: number }

/**
 * Qué alto hay que publicar en esta pasada, o `null` si no hay nada que hacer.
 *
 * Dos reglas, y las dos vienen de un fallo real:
 *
 * - **Solo estados asentados.** Seguir la animación fotograma a fotograma
 *   redimensionaría el WebView en cada uno, y rehacer la maqueta de una nota
 *   larga sesenta veces por segundo se nota.
 * - **Lo repetido se compara con el último alto publicado**, nunca con el
 *   fotograma anterior. Al cerrarse, Android baja el alto hasta cero con el
 *   estado en `CLOSING` y solo después manda uno con `CLOSED`, que trae ese
 *   mismo cero: comparando con el fotograma anterior, la única pasada que valía
 *   se descartaba y el alto se quedaba clavado en el del teclado abierto.
 *
 * Y `CLOSED` vale cero por definición, sin fiarse del alto que dejara el último
 * fotograma de la animación.
 */
export function insetToPublish(frame: KeyboardFrame, published: number): number | null {
  'worklet'
  if (frame.state !== KEYBOARD_OPEN && frame.state !== KEYBOARD_CLOSED) return null
  const next = frame.state === KEYBOARD_CLOSED ? 0 : frame.height
  return next === published ? null : next
}
