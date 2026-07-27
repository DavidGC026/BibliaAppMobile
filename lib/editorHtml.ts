import { AppColors } from '@/constants/Colors'
import { getNoteTableOverlayHtml, getNoteTableScript } from '@/lib/noteEditorTable'
import { getNoteDocumentCss } from '@/lib/editor/documentCss'
import { getNoteRibbonCss } from '@/lib/editor/ribbonCss'
import { NOTE_EDITOR_BUNDLE } from '@/lib/tiptap/bundle.generated'

/**
 * Página del WebView de una nota.
 *
 * Dos caminos con el mismo CSS de documento, que es lo que hace que la nota se
 * vea igual escribiéndola y leyéndola:
 *
 * - **Edición**: Tiptap con la cinta de opciones. El motor entero viaja en
 *   `NOTE_EDITOR_BUNDLE`, compilado aparte (`scripts/build_editor_bundle.mjs`).
 * - **Solo lectura**: el HTML tal cual, con el guion mínimo que compacta las
 *   tablas y las abre a pantalla completa al tocarlas.
 *
 * La cinta vive dentro del HTML, no en React Native: así pulsar un botón no
 * mueve el foco fuera del editor ni cierra el teclado.
 */
export function getEditorHtml(
  colors: AppColors,
  initialContent: string,
  activeFont: string,
  base64Fonts: Record<string, string>,
  isReadOnly = false,
  favoriteColors: string[] = [],
): string {
  // Tipografías descargadas: van en base64 para que la nota se vea igual sin red.
  const fontsCss = Object.keys(base64Fonts)
    .filter((fontId) => !!base64Fonts[fontId])
    .map(
      (fontId) => `
        @font-face {
          font-family: '${fontId}';
          src: url('data:font/ttf;base64,${base64Fonts[fontId]}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `,
    )
    .join('')

  const fontFamily =
    activeFont === 'Default'
      ? 'system-ui, sans-serif'
      : activeFont === 'serif' || activeFont === 'monospace'
        ? activeFont
        : `'${activeFont}', sans-serif`

  const documentCss = getNoteDocumentCss(colors, isReadOnly, fontFamily, fontsCss)

  if (isReadOnly) {
    return readOnlyPage(documentCss, initialContent)
  }
  return editorPage(documentCss, getNoteRibbonCss(colors), initialContent, activeFont, favoriteColors)
}

/** Evita que un `</script>` dentro del contenido cierre la etiqueta antes de tiempo. */
function escapeForScript(value: string): string {
  return value.replace(/<\/script/gi, '<\\/script')
}

function readOnlyPage(documentCss: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>${documentCss}</style>
</head>
<body>
  <div id="editor-wrapper">
    <div id="editor">${content || ''}</div>
  </div>

  ${getNoteTableOverlayHtml()}

  <script>
    (function() {
      var editor = document.getElementById('editor');
      var isReadOnly = true;
      ${getNoteTableScript()}
      wrapTablesForReadOnly();
    })();
  </script>
</body>
</html>`
}

function editorPage(
  documentCss: string,
  ribbonCss: string,
  content: string,
  activeFont: string,
  favoriteColors: string[],
): string {
  const boot = JSON.stringify({
    content: content || '',
    colors: favoriteColors,
    font: activeFont,
  })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>${documentCss}${ribbonCss}</style>
</head>
<body>
  <div id="app">
    <div id="editor"></div>
    <div id="ribbon" role="tablist"></div>
  </div>

  <script>window.__NOTE_BOOT__ = ${escapeForScript(boot)};</script>
  <script>${NOTE_EDITOR_BUNDLE}</script>
</body>
</html>`
}
