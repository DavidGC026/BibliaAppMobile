import { Node } from '@tiptap/core'
import { rawElement } from '../rawElement'

/**
 * Versiculo insertado desde el lector.
 *
 * Es atomico: su interior es HTML ya compuesto (referencia en <strong> mas el
 * texto de los versiculos) que el usuario no edita, solo mueve o borra. Al ser
 * un nodo del esquema no puede quedar "a medias", que es justo lo que pasaba
 * con contentEditable: un Backspace pegado al bloque se llevaba media
 * estructura y la nota guardaba el destrozo (docs-mobile/29).
 *
 * ponytail: espejo de desktop/src/lib/tiptap/nodes/verseBlock.ts
 */
export const VerseBlock = Node.create({
  name: 'verseBlock',
  group: 'block',
  atom: true,
  selectable: true,
  // Por encima del blockquote de StarterKit, que si no se lleva el versiculo.
  // Un blockquote sin la clase sigue siendo una cita normal.
  priority: 200,

  addAttributes() {
    return {
      html: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'blockquote.biblia-verse-quote',
        getAttrs: (element) => ({ html: (element as HTMLElement).innerHTML }),
      },
    ]
  },

  renderHTML({ node }) {
    return rawElement('blockquote', { class: 'biblia-verse-quote' }, String(node.attrs.html ?? ''))
  },
})
