import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'

/**
 * Imagen de la nota: ancho, alineación, modo fondo y arrastre.
 *
 * Todo son atributos del nodo, así que cada cambio es una transacción y entra
 * en deshacer/rehacer. Con el editor anterior esto mutaba el `style` del DOM y
 * por eso necesitaba un historial aparte.
 */

export type ImageAlign = 'left' | 'center' | 'right' | 'full'

export function selectedImage(editor: Editor): { pos: number; attrs: Record<string, any> } | null {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection)) return null
  if (selection.node.type.name !== 'imageBlock') return null
  return { pos: selection.from, attrs: selection.node.attrs }
}

export function setImageWidth(editor: Editor, percent: number) {
  editor.chain().focus().updateAttributes('imageBlock', { width: percent + '%' }).run()
}

export function imageWidthPercent(attrs: Record<string, any>): number {
  const parsed = parseInt(String(attrs.width ?? '60'), 10)
  return Number.isFinite(parsed) ? parsed : 60
}

export function setImageAlign(editor: Editor, align: ImageAlign) {
  const attrs =
    align === 'full'
      ? { width: '100%', align: 'center', float: null }
      : align === 'center'
        ? { align: 'center', float: null }
        : { align, float: align }
  editor.chain().focus().updateAttributes('imageBlock', attrs).run()
}

export function imageAlign(attrs: Record<string, any>): ImageAlign {
  if (String(attrs.width) === '100%') return 'full'
  if (attrs.float === 'left') return 'left'
  if (attrs.float === 'right') return 'right'
  return 'center'
}

/** Detrás del texto: posición absoluta con coordenadas propias. */
export function setImageBackground(editor: Editor, background: boolean) {
  editor
    .chain()
    .focus()
    .updateAttributes('imageBlock', background ? { background: true, float: null } : { background: false, left: null, top: null })
    .run()
}

/**
 * Arrastre de una imagen de fondo dentro del documento.
 *
 * Solo actúa sobre la imagen seleccionada y en modo fondo; el resto de gestos
 * los sigue tratando el editor (arrastrar el nodo, desplazar la nota). La
 * posición se escribe una sola vez al soltar: durante el gesto se mueve el
 * elemento del DOM, para no meter una transacción por cada píxel.
 */
export function bindBackgroundImageDrag(editor: Editor) {
  const dom = editor.view.dom as HTMLElement
  let drag: { pointerId: number; el: HTMLElement; startX: number; startY: number; left: number; top: number; moved: boolean } | null =
    null

  dom.addEventListener('pointerdown', (event) => {
    const image = selectedImage(editor)
    if (!image || !image.attrs.background) return
    const target = (event.target as HTMLElement | null)?.closest('.note-image-block.is-background')
    if (!(target instanceof HTMLElement)) return

    const hostRect = dom.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const left = Number.parseFloat(String(image.attrs.left ?? ''))
    const top = Number.parseFloat(String(image.attrs.top ?? ''))
    drag = {
      pointerId: event.pointerId,
      el: target,
      startX: event.clientX,
      startY: event.clientY,
      left: Number.isFinite(left) ? left : rect.left - hostRect.left + dom.scrollLeft,
      top: Number.isFinite(top) ? top : rect.top - hostRect.top + dom.scrollTop,
      moved: false,
    }
    target.classList.add('is-dragging')
    target.setPointerCapture(event.pointerId)
    event.preventDefault()
  })

  dom.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true
    const maxLeft = Math.max(0, dom.scrollWidth - drag.el.offsetWidth)
    const maxTop = Math.max(0, dom.scrollHeight - drag.el.offsetHeight)
    drag.el.style.left = Math.max(0, Math.min(drag.left + dx, maxLeft)) + 'px'
    drag.el.style.top = Math.max(0, Math.min(drag.top + dy, maxTop)) + 'px'
    event.preventDefault()
  })

  const finish = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const { el, moved } = drag
    drag = null
    el.classList.remove('is-dragging')
    if (!moved) return
    editor.chain().focus().updateAttributes('imageBlock', { left: el.style.left, top: el.style.top }).run()
  }

  dom.addEventListener('pointerup', finish)
  dom.addEventListener('pointercancel', finish)
}
