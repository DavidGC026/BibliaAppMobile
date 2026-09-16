import { Node } from '@tiptap/core'
import { rawElement } from '../rawElement'

/**
 * Entrada de diccionario Strong. Atomica, igual que el versiculo.
 *
 * ponytail: espejo de desktop/src/lib/tiptap/nodes/dictBlock.ts
 */
export const DictBlock = Node.create({
  name: 'dictBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      html: { default: '' },
      strong: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'aside.biblia-dict-entry',
        getAttrs: (element) => ({
          html: (element as HTMLElement).innerHTML,
          strong: (element as HTMLElement).getAttribute('data-strong'),
        }),
      },
    ]
  },

  renderHTML({ node }) {
    const attrs: Record<string, string> = { class: 'biblia-dict-entry' }
    if (node.attrs.strong) attrs['data-strong'] = String(node.attrs.strong)
    return rawElement('aside', attrs, String(node.attrs.html ?? ''))
  },
})
