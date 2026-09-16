export interface NoteBlockThemeColors {
  text: string
  textMuted: string
  background: string
  border: string
  accent: string
  primary: string
  primarySoft: string
}

/**
 * Estilos de los bloques de contenido de una nota (versículo, diccionario,
 * tabla) tal y como se guardan.
 *
 * Desde que el editor es Tiptap, los bloques son nodos del esquema y su
 * comportamiento —selección, integridad, mover, copiar, eliminar— vive en
 * `lib/tiptap/`. Aquí solo queda el aspecto, que hace falta también fuera del
 * editor: vista previa, tarjetas de libreta y PDF.
 *
 * Lo que las notas antiguas y la web siguen guardando dentro del contenido:
 *
 * - `.biblia-content-block`, el envoltorio. Ya no se genera; se respeta para no
 *   romper el HTML existente, pero sin borde ni fondo propios.
 * - `.biblia-block-handle` con sus botones. Es interfaz dentro del dato: el
 *   esquema la descarta al abrir la nota y aquí se oculta, para que no se vea
 *   ni siquiera antes de que el editor la haya limpiado.
 */
export function getNoteBlockCss(colors: NoteBlockThemeColors): string {
  return `
    .biblia-content-block {
      border: none;
      background: transparent;
      margin: 12px 0;
    }
    .biblia-block-handle,
    [data-block-action] {
      display: none !important;
    }
  `
}
