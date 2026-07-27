import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Imagen de la nota.
 *
 * Conserva el envoltorio .note-image-block con su ancho, alineacion y modo
 * fondo, que es el formato canonico del movil y el que ya entienden web y
 * escritorio. El estado vive en atributos del nodo, no en el style del DOM, de
 * modo que redimensionar, alinear o arrastrar sea una transaccion del documento
 * y entre en el historial: eso es lo que en el editor anterior obligaba a un
 * historial propio por instantaneas de innerHTML.
 *
 * ponytail: espejo de desktop/src/lib/tiptap/nodes/imageBlock.ts
 */
export const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: 'Imagen de la nota' },
      width: { default: '60%' },
      align: { default: 'center' },
      background: { default: false },
      left: { default: null },
      top: { default: null },
      float: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.note-image-block',
        getAttrs: (element) => {
          const el = element as HTMLElement
          const img = el.querySelector('img')
          if (!img) return false
          return {
            src: img.getAttribute('src') ?? '',
            alt: img.getAttribute('alt') ?? 'Imagen de la nota',
            width: el.style.width || '60%',
            align: el.style.textAlign || 'center',
            background: el.classList.contains('is-background'),
            left: el.style.left || null,
            top: el.style.top || null,
            float: el.style.float || null,
          }
        },
      },
      // Imagen suelta (nota antigua, pegado desde otra app): se adopta con los
      // valores por defecto en vez de perderla.
      {
        tag: 'img',
        getAttrs: (element) => {
          const img = element as HTMLElement
          if (img.closest('.note-image-block')) return false
          return {
            src: img.getAttribute('src') ?? '',
            alt: img.getAttribute('alt') ?? 'Imagen de la nota',
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    const { src, alt, width, align, background, left, top, float } = node.attrs
    const styles = [`text-align: ${align}`, `width: ${width}`, 'max-width: 100%', 'display: block']
    if (background) {
      styles.push('position: absolute', 'z-index: -1')
      if (left) styles.push(`left: ${left}`)
      if (top) styles.push(`top: ${top}`)
    } else if (float) {
      styles.push(`float: ${float}`, 'margin: 12px')
    } else {
      styles.push('margin: 12px auto')
    }
    return [
      'div',
      mergeAttributes({
        class: background ? 'note-image-block is-background' : 'note-image-block',
        style: styles.join('; '),
      }),
      [
        'img',
        {
          src: String(src),
          alt: String(alt),
          draggable: 'false',
          style: 'width: 100%; height: auto; border-radius: 8px',
        },
      ],
    ]
  },
})
