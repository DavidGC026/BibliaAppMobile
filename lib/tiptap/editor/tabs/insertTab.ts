import type { RibbonTab } from '../ribbonTypes'
import { openTablePicker } from '../tablePicker'
import { isBackgroundMode, toggleBackgroundMode } from '../backgroundMode'

/**
 * Pestaña Insertar: solo mete contenido nuevo.
 *
 * Lo que se hace *sobre* un elemento ya insertado vive en su pestaña
 * contextual, no aquí. Versículo, diccionario e imagen los resuelve el
 * anfitrión React Native, que es quien tiene los modales y el acceso a la
 * galería; la cinta solo se lo pide.
 */
export const insertTab: RibbonTab = {
  id: 'insertar',
  label: 'Insertar',
  icon: 'plus',
  groups: () => [
    {
      label: 'Biblia',
      items: [
        {
          label: 'Versículo',
          icon: 'bookOpen',
          hint: 'Insertar un versículo',
          wide: true,
          run: ({ post }) => post({ type: 'openVerseModal' }),
        },
        {
          label: 'Diccionario',
          icon: 'bookSearch',
          hint: 'Insertar una entrada Strong',
          wide: true,
          run: ({ post }) => post({ type: 'openDictionaryModal' }),
        },
      ],
    },
    {
      label: 'Fondos',
      items: [
        {
          // Una imagen de fondo esta detras del texto y no capta toques: este
          // modo las eleva un momento para poder seleccionarlas y moverlas.
          label: 'Modo fondos',
          icon: 'layers',
          hint: 'Poder seleccionar las imágenes que están detrás del texto',
          wide: true,
          active: () => isBackgroundMode(),
          run: () => toggleBackgroundMode(),
        },
      ],
    },
    {
      label: 'Elementos',
      items: [
        {
          label: 'Tabla',
          icon: 'table',
          hint: 'Insertar una tabla',
          wide: true,
          run: (ctx) => openTablePicker(ctx.editor),
        },
        {
          label: 'Imagen',
          icon: 'image',
          hint: 'Insertar una imagen de la galería',
          wide: true,
          run: ({ post }) => post({ type: 'openImagePicker' }),
        },
      ],
    },
  ],
}
