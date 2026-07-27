import type { RibbonGroup, RibbonContext } from '../ribbonTypes'
import { copySelectedBlock, cutSelectedBlock, moveSelectedBlock, removeSelectedBlock } from '../blockCommands'

/**
 * Grupos comunes a cualquier bloque seleccionado.
 *
 * Son las acciones que antes se dibujaban dentro del documento, en la barra del
 * bloque. Ahora viven en la pestaña contextual y el contenido de la nota queda
 * limpio (docs-mobile/32).
 */
export function blockActionGroups(_ctx: RibbonContext): RibbonGroup[] {
  return [
    {
      label: 'Orden',
      items: [
        {
          label: '↑',
          hint: 'Mover arriba',
          run: ({ editor }) => moveSelectedBlock(editor, 'up'),
        },
        {
          label: '↓',
          hint: 'Mover abajo',
          run: ({ editor }) => moveSelectedBlock(editor, 'down'),
        },
      ],
    },
    {
      label: 'Portapapeles',
      items: [
        {
          label: 'Copiar',
          wide: true,
          run: ({ editor }) => copySelectedBlock(editor),
        },
        {
          label: 'Cortar',
          wide: true,
          run: ({ editor }) => cutSelectedBlock(editor),
        },
      ],
    },
    {
      label: 'Bloque',
      items: [
        {
          label: 'Eliminar',
          wide: true,
          danger: true,
          run: ({ editor }) => removeSelectedBlock(editor),
        },
        {
          label: '✕',
          hint: 'Quitar la selección',
          run: (ctx) => ctx.clearSelection(),
        },
      ],
    },
  ]
}
