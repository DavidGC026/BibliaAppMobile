import { Node } from '@tiptap/core'

/**
 * Descarta la barra de botones (↑ ↓ Copiar Cortar Eliminar) al leer notas ya
 * guardadas.
 *
 * Esa barra es interfaz, no contenido: la web todavia la serializa dentro del
 * campo `content` de cada nota. Al entrar al esquema se tira, y al guardar no
 * se emite, que es la misma regla que aplica `stripBlockHandles` en el editor
 * anterior (docs-mobile/32).
 *
 * ponytail: espejo de desktop/src/lib/tiptap/nodes/blockHandle.ts
 */
export const StripBlockHandle = Node.create({
  name: 'stripBlockHandle',
  group: 'block',

  parseHTML() {
    return [{ tag: 'div.biblia-block-handle', ignore: true }]
  },

  renderHTML() {
    return ['div', {}]
  },
})
