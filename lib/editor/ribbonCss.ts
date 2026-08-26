import { AppColors } from '@/constants/Colors'

/**
 * Estilos de la cinta de opciones, la rueda cromática y el selector de tabla.
 *
 * Interfaz, no documento: nada de aquí llega al HTML guardado de la nota.
 *
 * A diferencia del escritorio, en el móvil la cinta va **abajo**: es donde
 * estaba la barra de herramientas, queda al alcance del pulgar y el teclado la
 * empuja hacia arriba en vez de taparla.
 */
export function getNoteRibbonCss(colors: AppColors): string {
  return `
    /* El alto de la caja de la app sale de dos medidas, no de 100%:
       --app-height  lo que el motor dice que se ve (visualViewport), porque al
                     abrirse el teclado la maqueta puede quedarse con el alto de
                     antes;
       --kb-cover    lo que el teclado siga tapando pese al relleno que pone
                     React Native (normalmente 0).
       Con las dos, la cinta queda entera justo encima del teclado. */
    #app {
      display: flex;
      flex-direction: column;
      height: calc(var(--app-height, 100%) - var(--kb-cover, 0px));
      min-height: 0;
    }

    /* ── Cinta ────────────────────────────────────────── */
    #ribbon {
      flex-shrink: 0;
      position: relative;
      z-index: 5;
      border-top: 1px solid ${colors.border};
      background: ${colors.card};
      box-shadow: 0 -5px 18px rgba(0, 0, 0, 0.05);
    }

    .ribbon-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px 0;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      border-bottom: 1px solid ${colors.border};
    }
    .ribbon-tabs::-webkit-scrollbar { display: none; }

    .ribbon-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      border: none;
      background: transparent;
      color: ${colors.textMuted};
      font-family: system-ui, sans-serif;
      font-size: 13px;
      font-weight: 700;
      min-height: 38px;
      padding: 7px 11px 6px;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .ribbon-tab.is-active {
      color: ${colors.primary};
      border-bottom-color: ${colors.primary};
    }
    /* Las contextuales se distinguen de un vistazo, como en Word. */
    .ribbon-tab.is-contextual {
      margin-left: 4px;
      border-radius: 9px 9px 0 0;
      background: ${colors.primarySoft};
      color: ${colors.primary};
    }
    .ribbon-tab.is-contextual.is-active {
      box-shadow: inset 0 0 0 1px ${colors.primaryBorder};
      border-bottom-color: ${colors.primary};
    }

    .ribbon-toggle {
      margin-left: auto;
      flex-shrink: 0;
      border: none;
      background: transparent;
      color: ${colors.textMuted};
      padding: 8px 10px;
      cursor: pointer;
    }

    .ribbon-groups {
      display: flex;
      align-items: stretch;
      gap: 7px;
      padding: 7px 8px 6px;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
    }
    .ribbon-groups::-webkit-scrollbar { display: none; }
    #ribbon.is-collapsed .ribbon-groups { display: none; }

    .ribbon-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      padding: 5px 6px 4px;
      border: 1px solid ${colors.border};
      border-radius: 12px;
      background: ${colors.cardMuted};
    }
    .ribbon-group:nth-child(even) { background: ${colors.muted}; }
    .ribbon-group-items {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ribbon-group-label {
      font-size: 9px;
      font-weight: 700;
      color: ${colors.textMuted};
      letter-spacing: 0.025em;
      line-height: 11px;
      white-space: nowrap;
    }

    .ribbon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 38px;
      height: 36px;
      padding: 0 8px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: ${colors.text};
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s, transform 0.1s;
    }
    .ribbon-btn.has-icon:not(.is-wide) { width: 38px; padding: 0; }
    .ribbon-btn.is-wide { min-width: 44px; font-size: 12px; }
    .ribbon-btn.is-wide.has-icon {
      gap: 6px;
      border: 1px solid ${colors.border};
      background: ${colors.card};
    }
    .ribbon-btn.is-heading-1 {
      font-size: 18px;
      font-weight: 850;
      letter-spacing: -0.04em;
    }
    .ribbon-btn.is-heading-2 {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .ribbon-btn:active { transform: scale(0.92); }
    .ribbon-btn.is-active {
      background: ${colors.primarySoft};
      color: ${colors.primary};
    }
    .ribbon-btn.is-danger { color: ${colors.danger}; }
    .ribbon-btn.is-danger.is-wide.has-icon { border-color: ${colors.danger}; }
    .ribbon-btn:disabled { opacity: 0.35; }

    .ribbon-icon {
      display: block;
      width: 19px;
      height: 19px;
      flex: 0 0 19px;
      overflow: visible;
    }
    .ribbon-tab .ribbon-icon { width: 16px; height: 16px; flex-basis: 16px; }
    .ribbon-toggle .ribbon-icon { width: 18px; height: 18px; }
    .ribbon-btn-label { line-height: 1; }

    .ribbon-select {
      height: 34px;
      border-radius: 8px;
      border: 1px solid ${colors.border};
      background: ${colors.card};
      color: ${colors.text};
      font-family: system-ui, sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 0 6px;
    }

    .ribbon-colors {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 58vw;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
    }
    .ribbon-colors::-webkit-scrollbar { display: none; }
    .color-dot {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 50%;
      border: 2px solid transparent;
      padding: 0;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .color-dot:active { transform: scale(0.88); }
    .color-dot.is-active {
      border-color: ${colors.primary};
      transform: scale(1.15);
      box-shadow: 0 0 0 2px ${colors.primarySoft};
    }
    /* "Auto": vuelve al color de texto del tema (cambia con el tema). */
    .color-dot.auto {
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${colors.muted};
      border-color: ${colors.border};
      color: ${colors.text};
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
    }
    .color-dot.wheel {
      background: conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
      border-color: ${colors.border};
    }

    /* ── Rueda cromática ──────────────────────────────── */
    #cw-overlay {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
    }
    #cw-overlay.open { display: flex; }
    #cw-panel {
      width: 280px;
      box-sizing: border-box;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid ${colors.border};
      background: ${colors.card};
      color: ${colors.text};
      font-family: system-ui, sans-serif;
    }
    #cw-title { margin: 0 0 12px; font-size: 14px; font-weight: 700; text-align: center; }
    #cw-wheel-wrap {
      position: relative;
      width: 220px;
      height: 220px;
      margin: 0 auto;
      touch-action: none;
    }
    #cw-canvas { display: block; width: 220px; height: 220px; border-radius: 50%; }
    #cw-marker {
      position: absolute;
      width: 18px;
      height: 18px;
      margin: -9px 0 0 -9px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
      pointer-events: none;
    }
    #cw-light {
      width: 100%;
      margin: 14px 0 10px;
      -webkit-appearance: none;
      height: 14px;
      border-radius: 999px;
      border: 1px solid ${colors.border};
    }
    #cw-light::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${colors.card};
      border: 2px solid ${colors.primary};
    }
    #cw-preview-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    #cw-preview {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid ${colors.border};
    }
    #cw-hex { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
    #cw-actions { display: flex; gap: 8px; }
    .cw-btn {
      flex: 1;
      padding: 10px 0;
      border-radius: 10px;
      border: 1px solid ${colors.border};
      background: ${colors.cardMuted};
      color: ${colors.text};
      font-weight: 700;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
    }
    .cw-btn.primary {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: #ffffff;
    }
    .cw-btn:active { opacity: 0.7; }

    /* ── Selector de tabla ────────────────────────────── */
    .tp-overlay {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      padding: 20px;
    }
    .tp-overlay.open { display: flex; }
    .tp-panel {
      width: 100%;
      max-width: 320px;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid ${colors.border};
      background: ${colors.card};
      color: ${colors.text};
      font-family: system-ui, sans-serif;
    }
    .tp-title { margin: 0 0 12px; font-size: 14px; font-weight: 700; text-align: center; }
    .tp-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .tp-label { flex: 1; font-size: 13px; font-weight: 600; }
    .tp-step {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid ${colors.border};
      background: ${colors.cardMuted};
      color: ${colors.text};
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
    }
    .tp-value { min-width: 26px; text-align: center; font-size: 15px; font-weight: 800; }
    .tp-toggle {
      width: 100%;
      padding: 9px 0;
      margin-bottom: 12px;
      border-radius: 10px;
      border: 1px solid ${colors.border};
      background: ${colors.cardMuted};
      color: ${colors.textMuted};
      font-size: 13px;
      font-weight: 700;
      font-family: system-ui, sans-serif;
      cursor: pointer;
    }
    .tp-toggle.is-on {
      border-color: ${colors.primaryBorder};
      background: ${colors.primarySoft};
      color: ${colors.primary};
    }
    .tp-preview {
      border: 1px dashed ${colors.border};
      border-radius: 10px;
      padding: 8px;
      margin-bottom: 12px;
      overflow-x: auto;
    }
    .tp-preview table { margin: 0; font-size: 11px; }
    .tp-preview th, .tp-preview td { padding: 4px 6px; }
    .tp-more { display: block; margin-top: 6px; font-size: 11px; color: ${colors.textMuted}; }
    .tp-actions { display: flex; gap: 8px; }
    .tp-btn {
      flex: 1;
      padding: 10px 0;
      border-radius: 10px;
      border: 1px solid ${colors.border};
      background: ${colors.cardMuted};
      color: ${colors.text};
      font-weight: 700;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
    }
    .tp-btn.primary {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: #ffffff;
    }
    .tp-btn:active { opacity: 0.7; }

    /* Tiptap monta su documento dentro de #editor. */
    #editor .ProseMirror {
      outline: none;
      min-height: 100%;
    }

    /* ── Selección de bloque y de imagen ──────────────── */
    /* ProseMirror marca el nodo seleccionado; el contorno es lo único que se
       ve, y el borde va reservado transparente para que no desplace nada. */
    #editor .ProseMirror-selectednode {
      outline: 2px solid ${colors.primary};
      outline-offset: 2px;
      border-radius: 10px;
    }
    #editor .ProseMirror-selectednode.note-image-block { outline-offset: 0; }
    #editor .selectedCell:after {
      content: '';
      position: absolute;
      inset: 0;
      background: ${colors.primarySoft};
      pointer-events: none;
    }
    #editor td, #editor th { position: relative; }
    /* Redimensionado de columnas arrastrando el borde. */
    #editor .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: 0;
      width: 4px;
      background: ${colors.primary};
      pointer-events: none;
    }
    #editor.resize-cursor { cursor: col-resize; }
    #editor p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
      color: ${colors.textMuted};
      opacity: 0.5;
    }
  `
}
