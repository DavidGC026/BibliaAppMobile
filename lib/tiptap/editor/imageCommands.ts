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

const DRAG_EDGE_SIZE = 64
const DRAG_MAX_SCROLL_STEP = 18

/**
 * Velocidad vertical al acercar el puntero a un borde visible del editor.
 * Es pura para poder comprobar la progresión sin depender de la maqueta DOM.
 */
export function imageDragScrollStep(pointerY: number, top: number, bottom: number): number {
  if (bottom <= top) return 0
  if (pointerY < top + DRAG_EDGE_SIZE) {
    const pressure = Math.min(1, Math.max(0, (top + DRAG_EDGE_SIZE - pointerY) / DRAG_EDGE_SIZE))
    return -Math.max(1, Math.ceil(DRAG_MAX_SCROLL_STEP * pressure))
  }
  if (pointerY > bottom - DRAG_EDGE_SIZE) {
    const pressure = Math.min(1, Math.max(0, (pointerY - (bottom - DRAG_EDGE_SIZE)) / DRAG_EDGE_SIZE))
    return Math.max(1, Math.ceil(DRAG_MAX_SCROLL_STEP * pressure))
  }
  return 0
}

type ImageDrag = {
  pointerId: number
  el: HTMLElement
  scrollHost: HTMLElement
  startX: number
  startY: number
  lastX: number
  lastY: number
  startScrollLeft: number
  startScrollTop: number
  left: number
  top: number
  moved: boolean
  scrollFrame: number | null
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
  const scrollHost = dom.closest('#editor') as HTMLElement | null
  let drag: ImageDrag | null = null

  const placeImage = (current: ImageDrag) => {
    const dx = current.lastX - current.startX + (current.scrollHost.scrollLeft - current.startScrollLeft)
    const dy = current.lastY - current.startY + (current.scrollHost.scrollTop - current.startScrollTop)
    const maxLeft = Math.max(0, current.scrollHost.scrollWidth - current.el.offsetWidth)
    const maxTop = Math.max(0, current.scrollHost.scrollHeight - current.el.offsetHeight)
    current.el.style.left = Math.max(0, Math.min(current.left + dx, maxLeft)) + 'px'
    current.el.style.top = Math.max(0, Math.min(current.top + dy, maxTop)) + 'px'
  }

  const autoScroll = () => {
    if (!drag) return
    const current = drag
    current.scrollFrame = null
    const rect = current.scrollHost.getBoundingClientRect()
    const step = imageDragScrollStep(current.lastY, rect.top, rect.bottom)
    if (step === 0) return

    const before = current.scrollHost.scrollTop
    const maxScroll = Math.max(0, current.scrollHost.scrollHeight - current.scrollHost.clientHeight)
    current.scrollHost.scrollTop = Math.max(0, Math.min(before + step, maxScroll))
    if (current.scrollHost.scrollTop !== before) {
      current.moved = true
      placeImage(current)
      current.scrollFrame = window.requestAnimationFrame(autoScroll)
    }
  }

  const scheduleAutoScroll = (current: ImageDrag) => {
    if (current.scrollFrame === null) current.scrollFrame = window.requestAnimationFrame(autoScroll)
  }

  dom.addEventListener('pointerdown', (event) => {
    if (!scrollHost) return
    const image = selectedImage(editor)
    if (!image || !image.attrs.background) return
    const target = (event.target as HTMLElement | null)?.closest('.note-image-block.is-background')
    if (!(target instanceof HTMLElement)) return

    const hostRect = scrollHost.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const left = Number.parseFloat(String(image.attrs.left ?? ''))
    const top = Number.parseFloat(String(image.attrs.top ?? ''))
    drag = {
      pointerId: event.pointerId,
      el: target,
      scrollHost,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startScrollLeft: scrollHost.scrollLeft,
      startScrollTop: scrollHost.scrollTop,
      left: Number.isFinite(left) ? left : rect.left - hostRect.left + scrollHost.scrollLeft,
      top: Number.isFinite(top) ? top : rect.top - hostRect.top + scrollHost.scrollTop,
      moved: false,
      scrollFrame: null,
    }
    target.classList.add('is-dragging')
    document.body.classList.add('image-dragging')
    target.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  })

  dom.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    const dx = drag.lastX - drag.startX
    const dy = drag.lastY - drag.startY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true
    placeImage(drag)
    scheduleAutoScroll(drag)
    event.preventDefault()
  })

  const finish = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const { el, moved, scrollFrame } = drag
    drag = null
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
    el.classList.remove('is-dragging')
    document.body.classList.remove('image-dragging')
    try {
      el.releasePointerCapture?.(event.pointerId)
    } catch {
      // El WebView puede haber liberado la captura al cancelar el gesto.
    }
    if (!moved) return
    editor.chain().focus().updateAttributes('imageBlock', { left: el.style.left, top: el.style.top }).run()
  }

  dom.addEventListener('pointerup', finish)
  dom.addEventListener('pointercancel', finish)
}
