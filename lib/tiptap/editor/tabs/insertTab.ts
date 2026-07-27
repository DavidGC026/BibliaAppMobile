import type { RibbonTab } from '../ribbonTypes'
import { openTablePicker } from '../tablePicker'

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
  groups: () => [
    {
      label: 'Biblia',
      items: [
        {
          label: 'Versículo',
          hint: 'Insertar un versículo',
          wide: true,
          run: ({ post }) => post({ type: 'openVerseModal' }),
        },
        {
          label: 'Diccionario',
          hint: 'Insertar una entrada Strong',
          wide: true,
          run: ({ post }) => post({ type: 'openDictionaryModal' }),
        },
      ],
    },
    {
      label: 'Elementos',
      items: [
        {
          label: 'Tabla',
          hint: 'Insertar una tabla',
          wide: true,
          run: (ctx) => openTablePicker(ctx.editor),
        },
        {
          label: 'Imagen',
          hint: 'Insertar una imagen de la galería',
          wide: true,
          run: ({ post }) => post({ type: 'openImagePicker' }),
        },
      ],
    },
  ],
}
