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
          label: 'Mover arriba',
          icon: 'arrowUp',
          hint: 'Mover arriba',
          run: ({ editor }) => moveSelectedBlock(editor, 'up'),
        },
        {
          label: 'Mover abajo',
          icon: 'arrowDown',
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
          icon: 'copy',
          wide: true,
          run: ({ editor }) => copySelectedBlock(editor),
        },
        {
          label: 'Cortar',
          icon: 'scissors',
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
          icon: 'trash',
          wide: true,
          danger: true,
          run: ({ editor }) => removeSelectedBlock(editor),
        },
        {
          label: 'Quitar selección',
          icon: 'close',
          hint: 'Quitar la selección',
          run: (ctx) => ctx.clearSelection(),
        },
      ],
    },
  ]
}
