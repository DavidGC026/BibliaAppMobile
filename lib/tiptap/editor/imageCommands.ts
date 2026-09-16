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
  editor.chain().updateAttributes('imageBlock', { width: percent + '%' }).run()
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
  editor.chain().updateAttributes('imageBlock', attrs).run()
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
    .updateAttributes('imageBlock', background ? { background: true, float: null } : { background: false, left: null, top: null })
    .run()
}

const DRAG_EDGE_SIZE = 64
const DRAG_MAX_SCROLL_STEP = 18
const DRAG_START_THRESHOLD = 6

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
  background: boolean
  moved: boolean
  insertionIndex: number | null
  scrollFrame: number | null
}

type ImageDropTarget = {
  insertionIndex: number
  boundaryY: number
  label: string
}

function selectImageElement(editor: Editor, element: HTMLElement): { pos: number; attrs: Record<string, any> } | null {
  try {
    const pos = editor.view.posAtDOM(element, 0)
    const node = editor.state.doc.nodeAt(pos)
    if (!node || node.type.name !== 'imageBlock') return null
    if (!(editor.state.selection instanceof NodeSelection) || editor.state.selection.from !== pos) {
      editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)))
    }
    return { pos, attrs: node.attrs }
  } catch {
    return null
  }
}

function blockDropName(type: string): string {
  if (type === 'verseBlock') return 'versículo'
  if (type === 'dictBlock') return 'definición'
  if (type === 'imageBlock') return 'imagen'
  if (type === 'table') return 'tabla'
  if (type === 'heading') return 'título'
  if (type === 'bulletList' || type === 'orderedList') return 'lista'
  if (type === 'blockquote') return 'cita'
  return 'texto'
}

/**
 * Resuelve la caída con la geometría de los bloques, no con el caret que
 * devuelve posAtCoords. En Android ese caret puede seguir perteneciendo a la
 * imagen capturada aunque visualmente ya esté encima de otro bloque.
 */
function imageDropTarget(editor: Editor, dragged: HTMLElement, pointerY: number): ImageDropTarget | null {
  const { doc } = editor.state
  let pos = 0
  let closest: (ImageDropTarget & { distance: number; centerDistance: number }) | null = null

  for (let index = 0; index < doc.childCount; index++) {
    const node = doc.child(index)
    const nodeDom = editor.view.nodeDOM(pos)
    pos += node.nodeSize
    if (!(nodeDom instanceof HTMLElement) || nodeDom === dragged) continue
    // Una imagen absoluta no representa un hueco del flujo de la nota.
    if (node.type.name === 'imageBlock' && node.attrs.background) continue

    const rect = nodeDom.getBoundingClientRect()
    if (!Number.isFinite(rect.top) || !Number.isFinite(rect.bottom)) continue
    const middle = rect.top + (rect.bottom - rect.top) / 2
    const after = pointerY >= middle
    const distance = pointerY < rect.top ? rect.top - pointerY : pointerY > rect.bottom ? pointerY - rect.bottom : 0
    const candidate = {
      insertionIndex: index + (after ? 1 : 0),
      boundaryY: after ? rect.bottom : rect.top,
      label: `Colocar ${after ? 'debajo' : 'arriba'} de ${blockDropName(node.type.name)}`,
      distance,
      centerDistance: Math.abs(pointerY - middle),
    }
    if (
      !closest ||
      candidate.distance < closest.distance ||
      (candidate.distance === closest.distance && candidate.centerDistance < closest.centerDistance)
    ) {
      closest = candidate
    }
  }

  return closest
}

function moveSelectedImageTo(editor: Editor, insertionIndex: number): boolean {
  const image = selectedImage(editor)
  if (!image || editor.state.selection.$anchor.depth !== 0) return false
  const currentIndex = editor.state.selection.$anchor.index()
  if (insertionIndex === currentIndex || insertionIndex === currentIndex + 1) return false

  const { doc } = editor.state
  const node = doc.child(currentIndex)
  let insertionPos = 0
  for (let i = 0; i < insertionIndex; i++) insertionPos += doc.child(i).nodeSize

  const tr = editor.state.tr.delete(image.pos, image.pos + node.nodeSize)
  const mappedPos = tr.mapping.map(insertionPos)
  tr.insert(mappedPos, node)
  tr.setSelection(NodeSelection.create(tr.doc, mappedPos))
  editor.view.dispatch(tr)
  return true
}

/**
 * Arrastre de imágenes dentro del documento.
 *
 * Las normales se levantan visualmente y cambian de posición en el flujo al
 * soltarlas. Las de fondo conservan movimiento libre. En ambos casos el borde
 * visible desplaza #editor y la transacción se escribe solo al final.
 */
export function bindImageDrag(editor: Editor) {
  const dom = editor.view.dom as HTMLElement
  const scrollHost = dom.closest('#editor') as HTMLElement | null
  let drag: ImageDrag | null = null
  const dropMarker = document.createElement('div')
  dropMarker.className = 'image-drop-indicator'
  dropMarker.setAttribute('aria-hidden', 'true')
  const dropLabel = document.createElement('span')
  dropMarker.appendChild(dropLabel)
  document.body.appendChild(dropMarker)

  const hideDropMarker = () => {
    dropMarker.classList.remove('is-visible')
    dropMarker.removeAttribute('data-insertion-index')
  }

  const updateDropMarker = (current: ImageDrag) => {
    if (current.background) {
      current.insertionIndex = null
      hideDropMarker()
      return
    }
    const target = imageDropTarget(editor, current.el, current.lastY)
    current.insertionIndex = target?.insertionIndex ?? null
    if (!target) {
      hideDropMarker()
      return
    }

    const hostRect = current.scrollHost.getBoundingClientRect()
    const inset = 12
    dropMarker.style.left = `${hostRect.left + inset}px`
    dropMarker.style.width = `${Math.max(0, hostRect.width - inset * 2)}px`
    dropMarker.style.top = `${Math.max(hostRect.top + 3, Math.min(target.boundaryY, hostRect.bottom - 3))}px`
    dropMarker.dataset.insertionIndex = String(target.insertionIndex)
    dropLabel.textContent = target.label
    dropMarker.classList.add('is-visible')
  }

  const placeImage = (current: ImageDrag) => {
    const dx = current.lastX - current.startX + (current.scrollHost.scrollLeft - current.startScrollLeft)
    const dy = current.lastY - current.startY + (current.scrollHost.scrollTop - current.startScrollTop)
    if (!current.background) {
      current.el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      return
    }
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
      updateDropMarker(current)
      current.scrollFrame = window.requestAnimationFrame(autoScroll)
    }
  }

  const scheduleAutoScroll = (current: ImageDrag) => {
    if (current.scrollFrame === null) current.scrollFrame = window.requestAnimationFrame(autoScroll)
  }

  dom.addEventListener('pointerdown', (event) => {
    if (!scrollHost) return
    const target = (event.target as HTMLElement | null)?.closest('.note-image-block')
    if (!(target instanceof HTMLElement)) return
    const image = selectImageElement(editor, target)
    if (!image) return

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
      background: !!image.attrs.background,
      moved: false,
      insertionIndex: null,
      scrollFrame: null,
    }
    target.classList.add('is-dragging')
    document.body.classList.add('image-dragging')
    target.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }, { capture: true })

  dom.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    const dx = drag.lastX - drag.startX
    const dy = drag.lastY - drag.startY
    if (Math.abs(dx) > DRAG_START_THRESHOLD || Math.abs(dy) > DRAG_START_THRESHOLD) drag.moved = true
    if (!drag.moved) {
      event.preventDefault()
      return
    }
    placeImage(drag)
    updateDropMarker(drag)
    scheduleAutoScroll(drag)
    event.preventDefault()
  })

  const finish = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const { el, moved, scrollFrame, background, insertionIndex } = drag
    const backgroundLeft = el.style.left
    const backgroundTop = el.style.top
    drag = null
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)
    el.classList.remove('is-dragging')
    document.body.classList.remove('image-dragging')
    hideDropMarker()
    if (!background) el.style.transform = ''
    try {
      el.releasePointerCapture?.(event.pointerId)
    } catch {
      // El WebView puede haber liberado la captura al cancelar el gesto.
    }
    if (!moved) return
    if (background) {
      const image = selectedImage(editor)
      if (!image) return
      const node = editor.state.doc.nodeAt(image.pos)
      if (!node) return
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(image.pos, undefined, {
          ...node.attrs,
          left: backgroundLeft,
          top: backgroundTop,
        }),
      )
      return
    }

    if (insertionIndex !== null) moveSelectedImageTo(editor, insertionIndex)
  }

  dom.addEventListener('pointerup', finish)
  dom.addEventListener('pointercancel', finish)
}
