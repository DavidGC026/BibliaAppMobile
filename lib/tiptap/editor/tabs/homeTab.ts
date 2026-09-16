import type { RibbonTab } from '../ribbonTypes'

/** Tamaños que ofrecía la barra del editor anterior. */
const SIZES = ['14px', '16px', '20px', '28px']

/**
 * Pestaña Inicio: el formato de texto de siempre.
 *
 * Los estados activos los responde el propio esquema (`editor.isActive`), que
 * es lo que antes había que deducir recorriendo el DOM en cada cambio de
 * selección.
 */
export const homeTab: RibbonTab = {
  id: 'inicio',
  label: 'Inicio',
  icon: 'type',
  groups: (ctx) => [
    {
      label: 'Deshacer',
      items: [
        {
          label: 'Deshacer',
          icon: 'undo',
          hint: 'Deshacer',
          disabled: () => !ctx.editor.can().undo(),
          run: ({ editor }) => editor.chain().focus().undo().run(),
        },
        {
          label: 'Rehacer',
          icon: 'redo',
          hint: 'Rehacer',
          disabled: () => !ctx.editor.can().redo(),
          run: ({ editor }) => editor.chain().focus().redo().run(),
        },
      ],
    },
    {
      label: 'Estilos',
      items: [
        {
          label: 'H1',
          emphasis: 'heading-1',
          hint: 'Título',
          active: ({ editor }) => editor.isActive('heading', { level: 1 }),
          run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          label: 'H2',
          emphasis: 'heading-2',
          hint: 'Subtítulo',
          active: ({ editor }) => editor.isActive('heading', { level: 2 }),
          run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: 'Normal',
          icon: 'paragraph',
          hint: 'Texto normal',
          wide: true,
          active: ({ editor }) => editor.isActive('paragraph'),
          run: ({ editor }) => editor.chain().focus().setParagraph().run(),
        },
      ],
    },
    {
      label: 'Fuente',
      items: [
        {
          label: 'Tipografía',
          icon: 'type',
          hint: 'Cambiar la tipografía de la nota',
          run: ({ post }) => post({ type: 'openFontModal' }),
        },
        {
          kind: 'select',
          hint: 'Tamaño de letra',
          options: SIZES.map((size) => ({ value: size, label: size.replace('px', '') })),
          value: ({ editor }) => {
            const current = editor.getAttributes('textStyle').fontSize
            return SIZES.includes(current) ? current : '16px'
          },
          run: ({ editor }, value) => editor.chain().focus().setFontSize(value).run(),
        },
      ],
    },
    {
      label: 'Formato',
      items: [
        {
          label: 'Negrita',
          icon: 'bold',
          hint: 'Negrita',
          active: ({ editor }) => editor.isActive('bold'),
          run: ({ editor }) => editor.chain().focus().toggleBold().run(),
        },
        {
          label: 'Cursiva',
          icon: 'italic',
          hint: 'Cursiva',
          active: ({ editor }) => editor.isActive('italic'),
          run: ({ editor }) => editor.chain().focus().toggleItalic().run(),
        },
        {
          label: 'Subrayado',
          icon: 'underline',
          hint: 'Subrayado',
          active: ({ editor }) => editor.isActive('underline'),
          run: ({ editor }) => editor.chain().focus().toggleUnderline().run(),
        },
        {
          label: 'Tachado',
          icon: 'strike',
          hint: 'Tachado',
          active: ({ editor }) => editor.isActive('strike'),
          run: ({ editor }) => editor.chain().focus().toggleStrike().run(),
        },
      ],
    },
    {
      label: 'Párrafo',
      items: [
        {
          label: 'Lista de viñetas',
          icon: 'list',
          hint: 'Lista de viñetas',
          active: ({ editor }) => editor.isActive('bulletList'),
          run: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: 'Lista numerada',
          icon: 'listOrdered',
          hint: 'Lista numerada',
          active: ({ editor }) => editor.isActive('orderedList'),
          run: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          label: 'Cita',
          icon: 'quote',
          hint: 'Cita',
          active: ({ editor }) => editor.isActive('blockquote'),
          run: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          label: 'Alinear a la izquierda',
          icon: 'alignLeft',
          hint: 'Alinear a la izquierda',
          active: ({ editor }) => editor.isActive({ textAlign: 'left' }),
          run: ({ editor }) => editor.chain().focus().setTextAlign('left').run(),
        },
        {
          label: 'Centrar',
          icon: 'alignCenter',
          hint: 'Centrar',
          active: ({ editor }) => editor.isActive({ textAlign: 'center' }),
          run: ({ editor }) => editor.chain().focus().setTextAlign('center').run(),
        },
        {
          label: 'Alinear a la derecha',
          icon: 'alignRight',
          hint: 'Alinear a la derecha',
          active: ({ editor }) => editor.isActive({ textAlign: 'right' }),
          run: ({ editor }) => editor.chain().focus().setTextAlign('right').run(),
        },
      ],
    },
    {
      label: 'Color',
      items: [{ kind: 'colors' }],
    },
  ],
}
