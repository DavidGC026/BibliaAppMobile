import type { RibbonTab } from '../ribbonTypes'
import { moveSelectedBlock, removeSelectedBlock } from '../blockCommands'
import {
  imageAlign,
  imageWidthPercent,
  selectedImage,
  setImageAlign,
  setImageBackground,
  setImageWidth,
} from '../imageCommands'

/**
 * Pestaña contextual de una imagen.
 *
 * Sustituye al panel inferior del editor anterior: las mismas funciones —
 * ancho, alineación, modo fondo, orden y borrar— pero en la cinta, de modo que
 * no tapa la nota ni obliga a esconder la cabecera para dejarle sitio.
 */
export const imageTab: RibbonTab = {
  id: 'formato-imagen',
  label: 'Formato de imagen',
  icon: 'image',
  contextual: true,
  matches: ({ editor }) => !!selectedImage(editor),
  groups: (ctx) => {
    const image = selectedImage(ctx.editor)
    const width = image ? imageWidthPercent(image.attrs) : 60
    const align = image ? imageAlign(image.attrs) : 'center'
    const background = !!image?.attrs.background

    return [
      {
        label: 'Tamaño',
        items: [25, 50, 75, 100].map((percent) => ({
          label: percent + ' %',
          hint: 'Ancho ' + percent + ' %',
          wide: true,
          active: () => width === percent,
          run: ({ editor }) => setImageWidth(editor, percent),
        })),
      },
      {
        label: 'Posición',
        items: [
          {
            label: 'Alinear a la izquierda',
            icon: 'alignLeft',
            hint: 'Alinear a la izquierda',
            active: () => align === 'left',
            run: ({ editor }) => setImageAlign(editor, 'left'),
          },
          {
            label: 'Centrar',
            icon: 'alignCenter',
            hint: 'Centrar',
            active: () => align === 'center',
            run: ({ editor }) => setImageAlign(editor, 'center'),
          },
          {
            label: 'Alinear a la derecha',
            icon: 'alignRight',
            hint: 'Alinear a la derecha',
            active: () => align === 'right',
            run: ({ editor }) => setImageAlign(editor, 'right'),
          },
          {
            label: 'Ancho completo',
            icon: 'alignFull',
            hint: 'Ancho completo',
            active: () => align === 'full',
            run: ({ editor }) => setImageAlign(editor, 'full'),
          },
        ],
      },
      {
        label: 'Ajuste',
        items: [
          {
            label: background ? 'Quitar fondo' : 'Detrás del texto',
            icon: 'behindText',
            hint: background
              ? 'Devolver la imagen al flujo del texto'
              : 'Enviar la imagen detrás del texto',
            wide: true,
            active: () => background,
            run: ({ editor }) => setImageBackground(editor, !background),
          },
        ],
      },
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
        label: 'Imagen',
        items: [
          {
            label: 'Eliminar',
            icon: 'trash',
            hint: 'Eliminar la imagen',
            wide: true,
            danger: true,
            run: ({ editor }) => removeSelectedBlock(editor),
          },
          {
            label: 'Quitar selección',
            icon: 'close',
            hint: 'Quitar la selección',
            run: () => ctx.clearSelection(),
          },
        ],
      },
    ]
  },
}
