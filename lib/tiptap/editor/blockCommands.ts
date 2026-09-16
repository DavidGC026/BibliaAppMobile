import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { DOMSerializer } from '@tiptap/pm/model'
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model'

/**
 * Acciones sobre el bloque seleccionado: mover, copiar, cortar y eliminar.
 *
 * Con el editor anterior esto era manipulación directa del DOM y un historial
 * propio por instantáneas de `innerHTML`. Aquí cada acción es una transacción
 * del documento, así que entra sola en deshacer/rehacer y no puede dejar un
 * bloque a medias.
 */

/** Rango del hijo de primer nivel que contiene la selección. */
function topLevelRange(editor: Editor): { from: number; to: number; index: number } | null {
  const { selection, doc } = editor.state
  if (selection instanceof NodeSelection && selection.$anchor.depth === 0) {
    return { from: selection.from, to: selection.to, index: selection.$anchor.index() }
  }
  const $from: ResolvedPos = selection.$from
  if ($from.depth === 0) return null
  return { from: $from.before(1), to: $from.after(1), index: $from.index(0) }
}

/** Texto plano de un bloque, incluido el HTML que guardan versículo y definición. */
export function blockPlainText(node: PMNode): string {
  const html = String(node.attrs?.html ?? '')
  if (html) {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return (tmp.textContent ?? '').trim()
  }
  return node.textContent.trim()
}

export function hasBlockSelection(editor: Editor, name: string): boolean {
  const { selection } = editor.state
  return selection instanceof NodeSelection && selection.node.type.name === name
}

/** Sube o baja el bloque un puesto entre sus hermanos de primer nivel. */
export function moveSelectedBlock(editor: Editor, direction: 'up' | 'down'): boolean {
  const range = topLevelRange(editor)
  if (!range) return false
  const { doc } = editor.state
  const target = direction === 'up' ? range.index - 1 : range.index + 1
  if (target < 0 || target >= doc.childCount) return false

  const node = doc.child(range.index)
  const sibling = doc.child(target)
  const insertAt = direction === 'up' ? range.from - sibling.nodeSize : range.to + sibling.nodeSize

  const tr = editor.state.tr.delete(range.from, range.to)
  const mapped = tr.mapping.map(insertAt)
  tr.insert(mapped, node)
  if (node.isAtom) {
    try {
      tr.setSelection(NodeSelection.create(tr.doc, mapped))
    } catch {
      // El nodo movido no admite NodeSelection: se deja el cursor donde caiga.
    }
  }
  editor.view.dispatch(tr.scrollIntoView())
  return true
}

/**
 * Copia el bloque al portapapeles.
 *
 * Se lleva el HTML a una selección real del documento antes de `copy`, porque
 * en el WebView `navigator.clipboard` no siempre está disponible y sin
 * selección el comando no copia nada. El elemento intermedio se retira siempre.
 */
export function copySelectedBlock(editor: Editor): boolean {
  const range = topLevelRange(editor)
  if (!range) return false
  const node = editor.state.doc.child(range.index)

  const holder = document.createElement('div')
  holder.setAttribute('contenteditable', 'true')
  holder.style.position = 'fixed'
  holder.style.opacity = '0'
  holder.style.pointerEvents = 'none'
  holder.style.left = '-9999px'
  holder.appendChild(DOMSerializer.fromSchema(editor.schema).serializeNode(node))
  document.body.appendChild(holder)

  let copied = false
  try {
    const selection = window.getSelection()
    const domRange = document.createRange()
    domRange.selectNodeContents(holder)
    selection?.removeAllRanges()
    selection?.addRange(domRange)
    copied = document.execCommand('copy')
    selection?.removeAllRanges()
  } catch {
    copied = false
  }
  holder.remove()

  if (!copied && navigator.clipboard?.writeText) {
    try {
      void navigator.clipboard.writeText(blockPlainText(node))
      copied = true
    } catch {
      copied = false
    }
  }
  editor.commands.focus()
  return copied
}

export function removeSelectedBlock(editor: Editor): boolean {
  const range = topLevelRange(editor)
  if (!range) return false
  editor.view.dispatch(editor.state.tr.delete(range.from, range.to).scrollIntoView())
  editor.commands.focus()
  return true
}

export function cutSelectedBlock(editor: Editor): boolean {
  copySelectedBlock(editor)
  return removeSelectedBlock(editor)
}
