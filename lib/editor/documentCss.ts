import { AppColors } from '@/constants/Colors'
import { getNoteBlockCss } from '@/lib/noteEditorBlocks'
import { getNoteTableCss } from '@/lib/noteEditorTable'

/**
 * Estilos del documento de una nota.
 *
 * Los comparten el editor y la vista de solo lectura (vista previa, tarjetas y
 * PDF), que es lo que garantiza que lo que se escribe se vea igual donde se
 * lee. Los estilos de la cinta viven aparte, en `ribbonCss.ts`: son interfaz,
 * no documento.
 */
export function getNoteDocumentCss(
  colors: AppColors,
  isReadOnly: boolean,
  fontFamily: string,
  fontsCss = '',
): string {
  return `
    ${fontsCss}

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
      background: ${isReadOnly ? 'transparent' : colors.background};
      color: ${colors.text};
      font-family: ${fontFamily};
      font-size: 16px;
      line-height: 1.65;
      -webkit-tap-highlight-color: transparent;
      -webkit-text-size-adjust: 100%;
      overflow: hidden;
    }

    /* ── Editor Area ─────────────────────────────────── */
    #editor-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    #editor {
      flex: 1 1 0;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      padding: ${isReadOnly ? '0' : '18px 20px'};
      padding-bottom: ${isReadOnly ? '0' : '24px'};
      outline: none;
      font-family: inherit;
      word-wrap: break-word;
      overflow-wrap: break-word;
      position: relative;
      z-index: 1;
      isolation: isolate;
    }

    #editor h1 { font-size: 1.55em; font-weight: 800; margin: 0.6em 0 0.3em; }
    #editor h2 { font-size: 1.28em; font-weight: 700; margin: 0.6em 0 0.3em; }

    #editor:empty:before {
      content: "Escribe aquí tu nota…";
      color: ${colors.textMuted};
      opacity: 0.5;
      pointer-events: none;
    }

    /* Color semántico: se resuelve con el tema actual, no se guarda negro/blanco. */
    #editor .note-color-auto { color: ${colors.text} !important; }

    /* ── Typography Niceness ──────────────────────────── */
    ul, ol { padding-left: 24px; margin: 6px 0; }
    li { margin: 3px 0; }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
      border-radius: 8px;
      overflow: hidden;
    }
    table, th, td { border: 1px solid ${colors.border}; }
    th, td { padding: 8px 12px; text-align: left; font-size: 14px; vertical-align: top; }
    th { background: ${colors.accent}; font-weight: 700; }

    ${getNoteTableCss(colors)}
    ${getNoteBlockCss(colors)}

    blockquote {
      border-left: 3px solid ${colors.primary};
      background: ${colors.primarySoft};
      padding: 10px 16px;
      margin: 12px 0;
      border-radius: 0 10px 10px 0;
      font-style: italic;
    }

    /* Entrada del diccionario Strong — distinta de versículos (blockquote) */
    .biblia-dict-entry {
      border: 1px solid rgba(124, 58, 237, 0.35);
      border-left: 4px solid #7C3AED;
      background: rgba(124, 58, 237, 0.08);
      border-radius: 12px;
      padding: 12px 14px;
      margin: 14px 0;
      font-style: normal;
    }
    .biblia-dict-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7C3AED;
      margin-bottom: 8px;
    }
    .biblia-dict-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }
    .biblia-dict-code {
      font-weight: 800;
      font-size: 15px;
      color: #6D28D9;
      background: rgba(124, 58, 237, 0.14);
      border-radius: 6px;
      padding: 2px 8px;
    }
    .biblia-dict-lemma {
      font-weight: 700;
      font-size: 16px;
      color: ${colors.text};
    }
    .biblia-dict-trans {
      font-size: 13px;
      color: ${colors.textMuted};
      font-style: italic;
    }
    .biblia-dict-body { display: flex; flex-direction: column; gap: 8px; }
    .biblia-dict-section-label {
      font-size: 11px;
      font-weight: 700;
      color: #7C3AED;
      margin-top: 2px;
    }
    .biblia-dict-section-text {
      font-size: 14px;
      line-height: 1.55;
      color: ${colors.text};
      white-space: pre-wrap;
    }

    a { color: ${colors.primary}; }

    /* ── Image Block ────────────────────────────────── */
    .note-image-block {
      max-width: 100%;
      box-sizing: border-box;
      transition: outline 0.15s ease, transform 0.22s ease;
      touch-action: none;
    }
    .note-image-block.is-background {
      position: absolute !important;
      /* El HTML conserva z-index:-1 por compatibilidad con clientes
         anteriores. Dentro del editor se normaliza a una capa local 0 para
         que nunca caiga detrás del fondo opaco del WebView. */
      z-index: 0 !important;
      margin: 0 !important;
      touch-action: none;
      pointer-events: none;
    }
    /* El modo Fondo guarda z-index: -1 inline (para que la nota se vea igual
       fuera del editor), así que aquí hace falta !important para ganarle al
       estilo inline y que la imagen pueda captar toques. */
    body.image-selection-mode .note-image-block.is-background,
    body.image-editing .note-image-block.is-background {
      z-index: 10 !important;
      pointer-events: auto;
      cursor: grab;
      opacity: 0.94;
      outline: 2px dashed ${colors.primary};
      outline-offset: 2px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    }
    /* Texto y bloques normales ocupan la capa 1. La imagen de fondo queda en
       0 durante lectura/escritura y sube a 10 solo al editar fondos. */
    #editor > :not(.note-image-block),
    #editor .ProseMirror > :not(.note-image-block) {
      position: relative;
      z-index: 1;
    }
    /* Mientras se arrastra o reordena: sin transición de posición, flotando
       por encima del texto y con sombra para dar sensación de "levantar".
       El #editor sube la especificidad para ganar a la regla de selección. */
    #editor .note-image-block.is-dragging,
    .note-image-block.is-dragging {
      transition: none !important;
      cursor: grabbing;
      z-index: 60 !important;
      opacity: 0.96;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      will-change: left, top, transform;
    }
    body.image-dragging {
      user-select: none;
      -webkit-user-select: none;
    }
    .note-image-block img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 0 auto;
    }
  `
}
