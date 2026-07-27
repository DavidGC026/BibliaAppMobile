/**
 * Modo Fondos.
 *
 * Una imagen de fondo va detrás del texto y con `pointer-events: none`, para
 * que se pueda escribir encima sin que atrape los toques. La contrapartida es
 * que tampoco se puede seleccionar, así que hace falta un modo que las eleve
 * temporalmente. Es interfaz pasajera: la clase vive en el `body`, nunca en la
 * nota.
 */
const MODE_CLASS = 'image-selection-mode'

export function isBackgroundMode(): boolean {
  return document.body.classList.contains(MODE_CLASS)
}

export function toggleBackgroundMode(): void {
  document.body.classList.toggle(MODE_CLASS)
}
