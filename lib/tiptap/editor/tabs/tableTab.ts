import type { RibbonTab } from '../ribbonTypes'
import { moveSelectedBlock } from '../blockCommands'

/**
 * Pestaña contextual de una tabla.
 *
 * Combinar y dividir celdas, alternar el encabezado y arrastrar el borde de una
 * columna vienen de `@tiptap/extension-table`: son las funciones que el editor
 * anterior no tenía y que a mano costaban cientos de líneas.
 */
export const tableTab: RibbonTab = {
  id: 'diseno-tabla',
  label: 'Diseño de tabla',
  contextual: true,
  matches: ({ editor }) => editor.isActive('table'),
  groups: () => [
    {
      label: 'Filas',
      items: [
        {
          label: '+ Fila',
          hint: 'Añadir una fila debajo',
          wide: true,
          run: ({ editor }) => editor.chain().focus().addRowAfter().run(),
        },
        {
          label: '− Fila',
          hint: 'Quitar esta fila',
          wide: true,
          run: ({ editor }) => editor.chain().focus().deleteRow().run(),
        },
      ],
    },
    {
      label: 'Columnas',
      items: [
        {
          label: '+ Col',
          hint: 'Añadir una columna a la derecha',
          wide: true,
          run: ({ editor }) => editor.chain().focus().addColumnAfter().run(),
        },
        {
          label: '− Col',
          hint: 'Quitar esta columna',
          wide: true,
          run: ({ editor }) => editor.chain().focus().deleteColumn().run(),
        },
      ],
    },
    {
      label: 'Celdas',
      items: [
        {
          label: 'Combinar',
          hint: 'Combinar las celdas seleccionadas',
          wide: true,
          disabled: ({ editor }) => !editor.can().mergeCells(),
          run: ({ editor }) => editor.chain().focus().mergeCells().run(),
        },
        {
          label: 'Dividir',
          hint: 'Dividir la celda',
          wide: true,
          disabled: ({ editor }) => !editor.can().splitCell(),
          run: ({ editor }) => editor.chain().focus().splitCell().run(),
        },
        {
          label: 'Encabezado',
          hint: 'Alternar la primera fila como encabezado',
          wide: true,
          run: ({ editor }) => editor.chain().focus().toggleHeaderRow().run(),
        },
      ],
    },
    {
      label: 'Orden',
      items: [
        { label: '↑', hint: 'Mover arriba', run: ({ editor }) => moveSelectedBlock(editor, 'up') },
        { label: '↓', hint: 'Mover abajo', run: ({ editor }) => moveSelectedBlock(editor, 'down') },
      ],
    },
    {
      label: 'Tabla',
      items: [
        {
          label: 'Eliminar',
          hint: 'Eliminar la tabla',
          wide: true,
          danger: true,
          run: ({ editor }) => editor.chain().focus().deleteTable().run(),
        },
        { label: '✕', hint: 'Quitar la selección', run: (ctx) => ctx.clearSelection() },
      ],
    },
  ],
}
