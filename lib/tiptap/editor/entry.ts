import { Editor } from '@tiptap/core'
import { buildNoteExtensions } from '../extensions'
import { Ribbon } from './ribbon'
import { ribbonTabs } from './tabs'
import { ColorWheel } from './colorWheel'
import { bindBackgroundImageDrag } from './imageCommands'
import type { RibbonContext } from './ribbonTypes'

/**
 * Arranque del editor dentro del WebView y puente con React Native.
 *
 * El protocolo de mensajes es el mismo que el del editor anterior, así que la
 * pantalla de la nota no tiene que saber qué motor hay debajo: sigue pidiendo
 * `getHtml`, mandando `insertVerse` y recibiendo `onChange`.
 */

type Boot = {
  content: string
  colors: string[]
  font: string
}

declare global {
  interface Window {
    __NOTE_BOOT__?: Boot
    /** El editor, para depurar desde el inspector y para las pruebas. */
    __noteEditor?: Editor
    handleAction?: (json: string) => void
    ReactNativeWebView?: { postMessage: (message: string) => void }
  }
}

function post(message: Record<string, unknown>) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

function fontStack(font: string) {
  if (!font || font === 'Default') return 'system-ui, sans-serif'
  if (font === 'serif' || font === 'monospace') return font
  return `'${font}', sans-serif`
}

function buildFontFaces(fonts: Record<string, string>) {
  return Object.entries(fonts)
    .filter(([, base64]) => !!base64)
    .map(
      ([id, base64]) => `@font-face { font-family: '${id}';
        src: url('data:font/ttf;base64,${base64}') format('truetype');
        font-weight: normal; font-style: normal; }`,
    )
    .join('\n')
}

export function startNoteEditor() {
  const boot: Boot = window.__NOTE_BOOT__ ?? { content: '', colors: [], font: 'Default' }
  const host = document.getElementById('editor') as HTMLElement
  const ribbonRoot = document.getElementById('ribbon') as HTMLElement
  if (!host || !ribbonRoot) return

  host.style.fontFamily = fontStack(boot.font)

  let notifyTimer: ReturnType<typeof setTimeout> | null = null
  const postHtmlNow = () => {
    if (notifyTimer) {
      clearTimeout(notifyTimer)
      notifyTimer = null
    }
    post({ type: 'onChange', html: editor.getHTML() })
  }
  // Con retardo: cruzar el puente con todo el HTML en cada tecla se nota en
  // notas largas. El guardado real usa getHtml, que lee el documento al vuelo.
  const postHtmlSoon = () => {
    if (notifyTimer) clearTimeout(notifyTimer)
    notifyTimer = setTimeout(postHtmlNow, 250)
  }

  const editor = new Editor({
    element: host,
    extensions: buildNoteExtensions(),
    content: boot.content || '',
    autofocus: false,
    onUpdate: postHtmlSoon,
    onSelectionUpdate: () => ribbon.render(),
    onTransaction: () => ribbon.render(),
  })

  const colorWheel = new ColorWheel((hex) => {
    editor.chain().focus().setColor(hex).run()
    ribbon.render()
  })

  const context: RibbonContext = {
    editor,
    post,
    colors: boot.colors ?? [],
    openColorWheel: () => colorWheel.open(editor.getAttributes('textStyle').color),
    clearSelection: () => {
      // Deshacer una selección de nodo: el cursor queda justo después, así que
      // la pestaña contextual se cierra y se puede seguir escribiendo.
      editor.chain().focus().setTextSelection(editor.state.selection.to).run()
      ribbon.render()
    },
  }

  const ribbon = new Ribbon(ribbonRoot, ribbonTabs, context)
  ribbon.render()
  bindBackgroundImageDrag(editor)
  window.__noteEditor = editor

  // El documento se desplaza dentro de su caja, no la página: el teclado ya
  // encoge el WebView desde React Native.
  const keepCaretVisible = () => {
    window.requestAnimationFrame(() => {
      // Desplazar exige que el documento ya esté maquetado; justo tras montar,
      // o si el nodo aún no tiene caja, ProseMirror lanza al medir.
      try {
        editor.commands.scrollIntoView()
      } catch {
        // Sin caja que medir todavía: el siguiente foco lo vuelve a intentar.
      }
    })
  }

  window.handleAction = (json: string) => {
    try {
      const action = JSON.parse(json) as { type: string; value?: any }

      if (action.type === 'getHtml') {
        if (notifyTimer) {
          clearTimeout(notifyTimer)
          notifyTimer = null
        }
        post({ type: 'getHtmlResponse', html: editor.getHTML() })
        return
      }
      if (action.type === 'updateContent') {
        editor.commands.setContent(action.value ?? '', { emitUpdate: false })
        return
      }
      if (action.type === 'updateColors') {
        context.colors = Array.isArray(action.value) ? action.value : []
        ribbon.render()
        return
      }
      if (action.type === 'loadFonts') {
        let style = document.getElementById('dynamic-fonts')
        if (!style) {
          style = document.createElement('style')
          style.id = 'dynamic-fonts'
          document.head.appendChild(style)
        }
        style.textContent = buildFontFaces(action.value ?? {})
        return
      }
      if (action.type === 'setFont') {
        host.style.fontFamily = fontStack(String(action.value ?? 'Default'))
        return
      }
      if (action.type === 'setKeyboardInset') {
        if ((action.value ?? 0) > 0) keepCaretVisible()
        return
      }
      if (action.type === 'blurEditor') {
        editor.commands.blur()
        return
      }
      if (action.type === 'insertVerse') {
        editor
          .chain()
          .focus()
          .insertContent({ type: 'verseBlock', attrs: { html: String(action.value ?? '') } })
          .run()
        return
      }
      if (action.type === 'insertDictionary') {
        editor.chain().focus().insertContent(String(action.value ?? '')).run()
        return
      }
      if (action.type === 'insertImage') {
        editor
          .chain()
          .focus()
          .insertContent({ type: 'imageBlock', attrs: { src: String(action.value ?? '') } })
          .run()
        return
      }
    } catch (error) {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  editor.on('focus', keepCaretVisible)
  post({ type: 'editorReady' })
}

startNoteEditor()
