import { AppColors } from '@/constants/Colors';
import {
  getNoteTableCss,
  getNoteTablePickerHtml,
  getNoteTableScript,
} from '@/lib/noteEditorTable';

/**
 * Generates the full WYSIWYG editor HTML that runs inside a WebView.
 * The formatting toolbar lives INSIDE the HTML so buttons never steal
 * focus from the contenteditable area (which is the root cause of
 * execCommand failing on mobile).
 *
 * When `isReadOnly` is true the toolbar is hidden and the content is
 * rendered as a static preview.
 */
export function getEditorHtml(
  colors: AppColors,
  initialContent: string,
  activeFont: string,
  base64Fonts: Record<string, string>,
  isReadOnly = false,
  favoriteColors: string[] = [],
): string {
  // Build @font-face rules from base64 font data for offline rendering
  let fontsCss = '';
  Object.keys(base64Fonts).forEach((fontId) => {
    const b64 = base64Fonts[fontId];
    if (b64) {
      fontsCss += `
        @font-face {
          font-family: '${fontId}';
          src: url('data:font/ttf;base64,${b64}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `;
    }
  });

  const fontFamily =
    activeFont === 'Default'
      ? 'system-ui, sans-serif'
      : activeFont === 'serif' || activeFont === 'monospace'
        ? activeFont
        : `'${activeFont}', sans-serif`;

  const colorsJson = JSON.stringify(favoriteColors);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>
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
    }

    #editor h1 { font-size: 1.55em; font-weight: 800; margin: 0.6em 0 0.3em; }
    #editor h2 { font-size: 1.28em; font-weight: 700; margin: 0.6em 0 0.3em; }

    #editor:empty:before {
      content: "Escribe aquí tu nota…";
      color: ${colors.textMuted};
      opacity: 0.5;
      pointer-events: none;
    }

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

    ${getNoteTableCss(colors, isReadOnly)}

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
      transition: outline 0.15s ease;
    }
    .note-image-block img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 0 auto;
    }

    /* ── Image Edit Panel ──────────────────────────────── */
    body.image-editing .toolbar-area {
      display: none;
    }
    body.image-editing #editor {
      padding-bottom: 220px;
    }
    #image-edit-panel {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 99999;
      display: none;
      background: ${colors.card};
      border: 1px solid ${colors.border};
      border-radius: 16px;
      padding: 10px;
      box-shadow: 0 16px 38px rgba(0,0,0,0.22);
      font-family: system-ui, sans-serif;
      color: ${colors.text};
    }
    #image-edit-panel .panel-grabber {
      width: 34px;
      height: 4px;
      border-radius: 999px;
      background: ${colors.border};
      margin: 0 auto 10px;
    }
    #image-edit-panel .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    #image-edit-panel .panel-title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    #image-edit-panel .panel-kicker {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${colors.textMuted};
    }
    #image-edit-panel .panel-name {
      font-size: 15px;
      font-weight: 800;
      color: ${colors.text};
    }
    #image-edit-panel .panel-close {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid ${colors.border};
      background: ${colors.background};
      color: ${colors.text};
      font-size: 18px;
      line-height: 1;
    }
    #image-edit-panel .panel-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    #image-edit-panel .panel-value {
      min-width: 46px;
      padding: 6px 8px;
      border-radius: 9px;
      background: ${colors.primarySoft};
      color: ${colors.primary};
      text-align: center;
      font-size: 12px;
      font-weight: 800;
    }
    #image-edit-panel .panel-section {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-bottom: 10px;
    }
    #image-edit-panel .panel-label {
      font-size: 11px;
      font-weight: 800;
      color: ${colors.textMuted};
    }
    #image-edit-panel .segmented {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }
    #image-edit-panel .panel-actions {
      display: grid;
      grid-template-columns: 1fr 1fr 1.1fr;
      gap: 6px;
    }
    #image-edit-panel button {
      min-height: 38px;
      border-radius: 10px;
      border: 1px solid ${colors.border};
      background: ${colors.background};
      color: ${colors.text};
      font-size: 12px;
      font-weight: 800;
      font-family: system-ui, sans-serif;
      transition: opacity 0.15s ease, transform 0.1s ease, background 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    #image-edit-panel button:active {
      transform: scale(0.97);
      opacity: 0.78;
    }
    #image-edit-panel button.active {
      background: ${colors.primary};
      border-color: ${colors.primary};
      color: #ffffff;
    }
    #image-edit-panel .danger {
      background: ${colors.danger};
      border-color: ${colors.danger};
      color: #ffffff;
    }
    #image-edit-panel input[type="range"] {
      flex: 1;
      height: 7px;
      -webkit-appearance: none;
      background: ${colors.border};
      border-radius: 999px;
      outline: none;
    }
    #image-edit-panel input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${colors.primary};
      border: 3px solid ${colors.card};
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      cursor: pointer;
    }

    /* ── Toolbar (only in edit mode) ──────────────────── */
    .toolbar-area {
      display: ${isReadOnly ? 'none' : 'flex'};
      flex-direction: column;
      flex-shrink: 0;
      position: relative;
      z-index: 5;
      border-top: 1px solid ${colors.border};
      background: ${colors.card};
    }

    .toolbar-row {
      display: flex;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      padding: 6px 10px;
      gap: 2px;
    }
    .toolbar-row::-webkit-scrollbar { display: none; }

    .tb {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 38px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: ${colors.text};
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.1s;
      -webkit-tap-highlight-color: transparent;
      padding: 0 6px;
      font-family: system-ui, sans-serif;
    }
    .tb:active { transform: scale(0.92); }
    .tb.active {
      background: ${colors.primarySoft};
      color: ${colors.primary};
    }
    .tb .lbl {
      font-size: 9px;
      font-weight: 500;
      color: ${colors.textMuted};
      margin-top: 1px;
    }

    .sep {
      width: 1px;
      height: 22px;
      background: ${colors.border};
      margin: 0 4px;
      flex-shrink: 0;
    }

    /* Size buttons with visual hierarchy */
    .tb-sz { flex-direction: column; gap: 0; padding: 2px 8px; }
    .tb-sz .letter { line-height: 1; }

    /* Colors row */
    .colors-row {
      display: flex;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      padding: 6px 10px 8px;
      gap: 10px;
      border-top: 1px solid ${colors.border};
    }
    .colors-row::-webkit-scrollbar { display: none; }

    .color-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid transparent;
      flex-shrink: 0;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .color-dot:active { transform: scale(0.88); }
    .color-dot.active {
      border-color: ${colors.primary};
      transform: scale(1.15);
      box-shadow: 0 0 0 2px ${colors.primarySoft};
    }

    /* Aux actions row */
    .aux-row {
      display: flex;
      padding: 4px 10px 8px;
      gap: 8px;
    }
    .aux-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 9px 0;
      border-radius: 10px;
      border: 1px solid ${colors.primaryBorder};
      background: ${colors.primarySoft};
      color: ${colors.primary};
      font-weight: 700;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .aux-btn:active { opacity: 0.7; }
    .aux-btn-dict {
      border-color: rgba(124, 58, 237, 0.35);
      background: rgba(124, 58, 237, 0.1);
      color: #6D28D9;
    }
  </style>
</head>
<body>
  <div id="editor-wrapper">
    <div id="editor" contenteditable="${!isReadOnly}">${initialContent || ''}</div>

    <div class="toolbar-area" id="toolbar">
      <!-- Row 1: Formatting -->
      <div class="toolbar-row" id="fmt-row">
        <button class="tb" id="btn-font" data-action="openFontModal">
          <span style="font-weight:800;">Tt</span>
        </button>

        <div class="sep"></div>

        <button class="tb tb-sz" data-action="size" data-val="14px">
          <span class="letter" style="font-size:12px;">A</span>
          <span class="lbl">14</span>
        </button>
        <button class="tb tb-sz" data-action="size" data-val="16px">
          <span class="letter" style="font-size:15px;">A</span>
          <span class="lbl">16</span>
        </button>
        <button class="tb tb-sz" data-action="size" data-val="20px">
          <span class="letter" style="font-size:18px;">A</span>
          <span class="lbl">20</span>
        </button>
        <button class="tb tb-sz" data-action="size" data-val="28px">
          <span class="letter" style="font-size:22px;">A</span>
          <span class="lbl">28</span>
        </button>

        <div class="sep"></div>

        <button class="tb" data-action="heading" data-val="h1" style="font-weight:800;">H1</button>
        <button class="tb" data-action="heading" data-val="h2" style="font-weight:700;">H2</button>

        <div class="sep"></div>

        <button class="tb" data-action="bold" style="font-weight:900;">B</button>
        <button class="tb" data-action="italic" style="font-style:italic;">I</button>
        <button class="tb" data-action="underline" style="text-decoration:underline;">U</button>
        <button class="tb" data-action="strikeThrough" style="text-decoration:line-through;">S</button>

        <div class="sep"></div>

        <button class="tb" data-action="insertUnorderedList">•≡</button>
        <button class="tb" data-action="insertOrderedList">1.</button>

        <div class="sep"></div>

        <button class="tb" data-action="indent">⇥</button>
        <button class="tb" data-action="outdent">⇤</button>

        <div class="sep"></div>

        <button class="tb" data-action="insertTable">⊞</button>
        <button class="tb" data-action="insertImage">🖼️</button>

        <div class="sep"></div>

        <button class="tb tb-sz" data-action="selectAll">
          <span class="letter" style="font-size:14px;">▣</span>
          <span class="lbl">Todo</span>
        </button>
      </div>

      <!-- Row 2: Colors -->
      <div class="colors-row" id="colors-row"></div>

      <!-- Row 3: Aux actions -->
      <div class="aux-row">
        <button class="aux-btn" data-action="insertVerse">Versículo</button>
        <button class="aux-btn" data-action="insertReferences">Referencias</button>
        <button class="aux-btn aux-btn-dict" data-action="insertDictionary">Diccionario</button>
      </div>
    </div>
  </div>

  ${getNoteTablePickerHtml(isReadOnly)}

  <script>
    (function() {
      var editor = document.getElementById('editor');
      var isReadOnly = ${isReadOnly};

      /* ── Color palette state ───────────────────────── */
      var colorPalette = ${colorsJson};
      var activeColor = '${colors.text}';
      var activeSize = '16px';
      var savedRange = null;
      var scrollTimer = null;
      var keyboardInset = 0;

      var activeImage = null;
      var activeImageBlock = null;
      var panel = null;
      var imageEditActive = false;

      function setImageEditMode(active) {
        if (imageEditActive === active) return;
        imageEditActive = active;
        document.body.classList.toggle('image-editing', active);
        if (active) {
          editor.blur();
          editor.setAttribute('contenteditable', 'false');
        } else if (!isReadOnly) {
          editor.setAttribute('contenteditable', 'true');
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'imageEditMode',
          active: active
        }));
      }

      function createPanel() {
        if (panel) return;
        panel = document.createElement('div');
        panel.id = 'image-edit-panel';

        panel.innerHTML = [
          '<div class="panel-grabber"></div>',
          '<div class="panel-header">',
          '  <div class="panel-title">',
          '    <span class="panel-kicker">Imagen seleccionada</span>',
          '    <span class="panel-name">Editar imagen</span>',
          '  </div>',
          '  <button type="button" class="panel-close" id="btn-image-close" aria-label="Cerrar">×</button>',
          '</div>',
          '<div class="panel-section">',
          '  <div class="panel-row">',
          '    <span class="panel-label">Tamaño</span>',
          '    <input type="range" id="panel-width-slider" min="20" max="100" step="5" />',
          '    <span class="panel-value" id="panel-width-lbl">60%</span>',
          '  </div>',
          '</div>',
          '<div class="panel-section">',
          '  <span class="panel-label">Alineación</span>',
          '  <div class="segmented">',
          '    <button type="button" id="btn-align-left">Izq.</button>',
          '    <button type="button" id="btn-align-center">Centro</button>',
          '    <button type="button" id="btn-align-right">Der.</button>',
          '    <button type="button" id="btn-align-full">100%</button>',
          '  </div>',
          '</div>',
          '<div class="panel-actions">',
          '  <button type="button" id="btn-move-up">Subir</button>',
          '  <button type="button" id="btn-move-down">Bajar</button>',
          '  <button type="button" class="danger" id="btn-image-delete">Borrar</button>',
          '</div>'
        // ponytail: en este template literal hay que escribir join('\\n');
        // si se usa join con escape simple, el WebView recibe un string
        // partido y todo el script falla (toolbar, colores, fuentes).
        ].join('\\n');

        document.body.appendChild(panel);

        // Bind events
        var slider = document.getElementById('panel-width-slider');
        slider.addEventListener('input', function() {
          if (!activeImageBlock) return;
          var w = this.value + '%';
          activeImageBlock.style.width = w;
          document.getElementById('panel-width-lbl').textContent = w;
          notifyChangeNow();
        });

        document.getElementById('btn-image-close').addEventListener('click', hidePanel);
        document.getElementById('btn-align-left').addEventListener('click', function() { setAlign('left'); });
        document.getElementById('btn-align-center').addEventListener('click', function() { setAlign('center'); });
        document.getElementById('btn-align-right').addEventListener('click', function() { setAlign('right'); });
        document.getElementById('btn-align-full').addEventListener('click', function() { setAlign('full'); });

        document.getElementById('btn-move-up').addEventListener('click', function() {
          if (!activeImageBlock) return;
          var prev = activeImageBlock.previousElementSibling;
          if (prev) {
            activeImageBlock.parentNode.insertBefore(activeImageBlock, prev);
            keepImageVisible();
            notifyChangeNow();
          }
        });

        document.getElementById('btn-move-down').addEventListener('click', function() {
          if (!activeImageBlock) return;
          var next = activeImageBlock.nextElementSibling;
          if (next) {
            activeImageBlock.parentNode.insertBefore(activeImageBlock, next.nextElementSibling);
            keepImageVisible();
            notifyChangeNow();
          }
        });

        document.getElementById('btn-image-delete').addEventListener('click', function() {
          if (!activeImageBlock) return;
          activeImageBlock.remove();
          hidePanel();
          notifyChangeNow();
        });

        panel.addEventListener('mousedown', function(e) {
          e.preventDefault();
        });
        panel.addEventListener('touchstart', function(e) {
          e.stopPropagation();
        }, { passive: true });
      }

      function setAlign(align) {
        if (!activeImageBlock) return;
        activeImageBlock.style.display = 'block';
        activeImageBlock.style.float = 'none';
        activeImageBlock.style.margin = '12px auto';
        activeImageBlock.style.textAlign = 'center';

        var slider = document.getElementById('panel-width-slider');
        var w = slider.value + '%';

        if (align === 'left') {
          activeImageBlock.style.display = 'inline-block';
          activeImageBlock.style.float = 'left';
          activeImageBlock.style.margin = '8px 16px 8px 0';
          activeImageBlock.style.textAlign = 'left';
        } else if (align === 'right') {
          activeImageBlock.style.display = 'inline-block';
          activeImageBlock.style.float = 'right';
          activeImageBlock.style.margin = '8px 0 8px 16px';
          activeImageBlock.style.textAlign = 'right';
        } else if (align === 'full') {
          activeImageBlock.style.display = 'block';
          activeImageBlock.style.float = 'none';
          activeImageBlock.style.margin = '12px 0';
          activeImageBlock.style.width = '100%';
          slider.value = 100;
          document.getElementById('panel-width-lbl').textContent = '100%';
        } else {
          activeImageBlock.style.display = 'block';
          activeImageBlock.style.float = 'none';
          activeImageBlock.style.margin = '12px auto';
          activeImageBlock.style.textAlign = 'center';
        }

        updateAlignButtons(align);
        keepImageVisible();
        notifyChangeNow();
      }

      function updateAlignButtons(activeAlign) {
        ['left', 'center', 'right', 'full'].forEach(function(a) {
          var btn = document.getElementById('btn-align-' + a);
          if (!btn) return;
          btn.classList.toggle('active', a === activeAlign);
        });
      }

      function keepImageVisible() {
        if (!activeImageBlock) return;
        requestAnimationFrame(function() {
          var rect = activeImageBlock.getBoundingClientRect();
          var panelHeight = panel ? panel.offsetHeight : 210;
          var safeBottom = window.innerHeight - panelHeight - 28;
          if (rect.bottom > safeBottom) {
            editor.scrollTop += rect.bottom - safeBottom;
          } else if (rect.top < 18) {
            editor.scrollTop += rect.top - 18;
          }
        });
      }

      function showImageEditPanel(img, block) {
        if (isReadOnly) return;
        activeImage = img;
        activeImageBlock = block;
        createPanel();

        var currentWidth = block.style.width || '60%';
        var numWidth = parseInt(currentWidth, 10) || 60;
        
        var slider = document.getElementById('panel-width-slider');
        slider.value = numWidth;
        document.getElementById('panel-width-lbl').textContent = numWidth + '%';

        var align = 'center';
        if (block.style.float === 'left') {
          align = 'left';
        } else if (block.style.float === 'right') {
          align = 'right';
        } else if (block.style.width === '100%') {
          align = 'full';
        }
        updateAlignButtons(align);

        setImageEditMode(true);
        panel.style.display = 'block';
        keepImageVisible();

        document.querySelectorAll('.note-image-block').forEach(function(b) {
          b.style.outline = 'none';
        });
        block.style.outline = '2px solid ${colors.primary}';
        block.style.outlineOffset = '2px';
      }

      function hidePanel() {
        if (panel) {
          panel.style.display = 'none';
        }
        setImageEditMode(false);
        document.querySelectorAll('.note-image-block').forEach(function(b) {
          b.style.outline = 'none';
          b.style.outlineOffset = '';
        });
        activeImage = null;
        activeImageBlock = null;
      }

      function buildImageBlockHtml(url) {
        return '<div class="note-image-block" style="text-align: center; width: 60%; max-width: 100%; display: block; margin: 12px auto;">' +
               '  <img src="' + url + '" style="width: 100%; height: auto; border-radius: 8px;" />' +
               '</div><p><br></p>';
      }

      function clearImageEditingChrome() {
        if (panel) {
          panel.style.display = 'none';
        }
        document.querySelectorAll('.note-image-block').forEach(function(b) {
          b.style.outline = 'none';
          b.style.outlineOffset = '';
        });
        activeImage = null;
        activeImageBlock = null;
        setImageEditMode(false);
      }

      function cssEscape(value) {
        return String(value).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
      }

      function ensureDynamicFontStyle() {
        var style = document.getElementById('dynamic-font-faces');
        if (!style) {
          style = document.createElement('style');
          style.id = 'dynamic-font-faces';
          document.head.appendChild(style);
        }
        return style;
      }

      function buildFontFaces(fonts) {
        var css = '';
        Object.keys(fonts || {}).forEach(function(fontId) {
          var b64 = fonts[fontId];
          if (!b64) return;
          var safeId = cssEscape(fontId);
          css += "@font-face{font-family:'" + safeId + "';src:url('data:font/ttf;base64," + b64 + "') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}\\n";
        });
        return css;
      }

      function fontStack(fontId) {
        if (fontId === 'Default') return 'system-ui, sans-serif';
        if (fontId === 'serif' || fontId === 'monospace') return fontId;
        return "'" + cssEscape(fontId) + "', sans-serif";
      }

      function saveSelection() {
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        if (editor.contains(sel.anchorNode)) {
          savedRange = sel.getRangeAt(0).cloneRange();
        }
      }

      function restoreSelection() {
        if (!savedRange) return;
        try {
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedRange);
        } catch (e) {
          savedRange = null;
        }
      }

      function elementHasFormat(el, action) {
        if (!el || el === editor) return false;
        if (action === 'bold') return el.tagName === 'B' || el.tagName === 'STRONG' || el.style.fontWeight === 'bold' || el.style.fontWeight === '700';
        if (action === 'italic') return el.tagName === 'I' || el.tagName === 'EM' || el.style.fontStyle === 'italic';
        if (action === 'underline') return el.tagName === 'U' || (el.style.textDecoration && el.style.textDecoration.indexOf('underline') >= 0);
        if (action === 'strikeThrough') return el.tagName === 'S' || el.tagName === 'STRIKE' || el.tagName === 'DEL' || (el.style.textDecoration && el.style.textDecoration.indexOf('line-through') >= 0);
        return false;
      }

      function findFormatAncestor(node, action) {
        var el = node && node.nodeType === 3 ? node.parentElement : node;
        while (el && el !== editor) {
          if (elementHasFormat(el, action)) return el;
          el = el.parentElement;
        }
        return null;
      }

      function unwrapElement(el) {
        var parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }

      function setCaretRange(range) {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        savedRange = range.cloneRange();
      }

      function stripFormatFromFragment(fragment, action) {
        var holder = document.createElement('div');
        holder.appendChild(fragment);
        var nodes = holder.querySelectorAll('*');
        var toUnwrap = [];
        for (var i = 0; i < nodes.length; i++) {
          if (elementHasFormat(nodes[i], action)) toUnwrap.push(nodes[i]);
        }
        for (var j = toUnwrap.length - 1; j >= 0; j--) {
          if (toUnwrap[j].parentNode) unwrapElement(toUnwrap[j]);
        }
        var cleaned = document.createDocumentFragment();
        while (holder.firstChild) cleaned.appendChild(holder.firstChild);
        return cleaned;
      }

      function removeInlineFormat(action, range) {
        if (!range.collapsed) {
          var extracted = range.extractContents();
          var cleaned = stripFormatFromFragment(extracted, action);
          range.insertNode(cleaned);
          range.selectNodeContents(cleaned);
          range.collapse(false);
          setCaretRange(range);
          return;
        }

        var fmtEl = findFormatAncestor(range.startContainer, action);
        if (!fmtEl) return;

        var zwspOnly = fmtEl.textContent === '\\u200B';
        if (zwspOnly) {
          var afterMarker = document.createRange();
          afterMarker.setStartAfter(fmtEl);
          afterMarker.collapse(true);
          fmtEl.remove();
          setCaretRange(afterMarker);
          return;
        }

        var container = range.startContainer;
        var offset = range.startOffset;
        if (container.nodeType === 3 && fmtEl.contains(container)) {
          var text = container.textContent || '';
          if (offset === 0) {
            var beforeEl = document.createRange();
            beforeEl.setStartBefore(fmtEl);
            beforeEl.collapse(true);
            setCaretRange(beforeEl);
            return;
          }
          if (offset >= text.length && container === fmtEl.lastChild) {
            var afterEl = document.createRange();
            afterEl.setStartAfter(fmtEl);
            afterEl.collapse(true);
            setCaretRange(afterEl);
            return;
          }
          var afterText = text.slice(offset);
          container.textContent = text.slice(0, offset);
          var plainNode = afterText ? document.createTextNode(afterText) : null;
          if (plainNode) fmtEl.parentNode.insertBefore(plainNode, fmtEl.nextSibling);
          var splitCaret = document.createRange();
          if (plainNode) {
            splitCaret.setStart(plainNode, 0);
          } else {
            splitCaret.setStartAfter(fmtEl);
          }
          splitCaret.collapse(true);
          setCaretRange(splitCaret);
          return;
        }

        var fallback = document.createRange();
        fallback.setStartAfter(fmtEl);
        fallback.collapse(true);
        setCaretRange(fallback);
      }

      function applyInlineFormatWrap(action, range) {
        var tags = { bold: 'strong', italic: 'em', underline: 'u', strikeThrough: 's' };
        var tag = tags[action];
        if (!tag) return;
        var el = document.createElement(tag);

        if (range.collapsed) {
          el.appendChild(document.createTextNode('\\u200B'));
          range.insertNode(el);
          range.setStart(el.firstChild, 1);
          range.setEnd(el.firstChild, 1);
        } else {
          try {
            range.surroundContents(el);
          } catch (e) {
            var fragment = range.extractContents();
            el.appendChild(fragment);
            range.insertNode(el);
          }
          range.selectNodeContents(el);
          range.collapse(false);
        }
        setCaretRange(range);
      }

      function toggleInlineFormat(action) {
        restoreSelection();
        editor.focus();
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        if (isFormatActive(action)) {
          removeInlineFormat(action, range);
        } else {
          applyInlineFormatWrap(action, range);
        }
      }

      function isFormatActive(action) {
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return false;
        var node = sel.anchorNode;
        if (!node || !editor.contains(node)) return false;
        return !!findFormatAncestor(node, action);
      }

      function runToolbarAction(btn) {
        saveSelection();
        restoreSelection();
        var action = btn.getAttribute('data-action');
        var val = btn.getAttribute('data-val') || null;

        if (action === 'insertImage') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openImagePicker' }));
          return;
        }

        if (action === 'openFontModal') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openFontModal' }));
          return;
        }

        if (action === 'size') {
          applySize(val);
          return;
        }

        if (action === 'insertTable') {
          openTablePicker();
          return;
        }

        if (action === 'insertReferences') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openReferenceModal' }));
          return;
        }

        if (action === 'selectAll') {
          editor.focus();
          var allRange = document.createRange();
          allRange.selectNodeContents(editor);
          var allSel = window.getSelection();
          allSel.removeAllRanges();
          allSel.addRange(allRange);
          savedRange = allRange.cloneRange();
          updateActiveStates();
          return;
        }

        if (action === 'heading') {
          editor.focus();
          restoreSelection();
          var currentBlock = '';
          try { currentBlock = String(document.queryCommandValue('formatBlock')).toLowerCase(); } catch (e) {}
          document.execCommand('formatBlock', false, currentBlock === val ? 'p' : val);
          updateActiveStates();
          notifyChange();
          scrollCaretIntoView();
          return;
        }

        if (action === 'bold' || action === 'italic' || action === 'underline' || action === 'strikeThrough') {
          toggleInlineFormat(action);
          updateActiveStates();
          notifyChange();
          scrollCaretIntoView();
          return;
        }

        editor.focus();
        restoreSelection();
        document.execCommand(action, false, val);
        updateActiveStates();
        notifyChange();
        scrollCaretIntoView();
      }

      function insertHtmlAtSelection(html, shouldFocus) {
        restoreSelection();
        if (shouldFocus !== false) editor.focus();
        var sel = window.getSelection();
        var range = null;
        if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
          range = sel.getRangeAt(0);
        } else {
          range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
        }
        var holder = document.createElement('div');
        holder.innerHTML = html;
        var frag = document.createDocumentFragment();
        while (holder.firstChild) frag.appendChild(holder.firstChild);
        range.collapse(false);
        range.insertNode(frag);
        range.collapse(false);
        setCaretRange(range);
      }

      function bindToolbarButton(btn, handler) {
        var lastTouch = 0;
        var touchStartX = 0;
        var touchStartY = 0;
        var isTap = false;

        btn.addEventListener('touchstart', function(e) {
          isTap = true;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          saveSelection();
        }, { passive: true });

        btn.addEventListener('touchmove', function(e) {
          var dx = Math.abs(e.touches[0].clientX - touchStartX);
          var dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 8 || dy > 8) isTap = false;
        }, { passive: true });

        btn.addEventListener('touchend', function(e) {
          if (!isTap) return;
          e.preventDefault();
          lastTouch = Date.now();
          handler();
        }, { passive: false });

        btn.addEventListener('mousedown', function(e) {
          saveSelection();
          e.preventDefault();
        });

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (Date.now() - lastTouch < 400) return;
          saveSelection();
          handler();
        });
      }

      function enableHorizontalScroll(row) {
        var startX = 0;
        var startScroll = 0;
        var dragging = false;
        row.addEventListener('touchstart', function(e) {
          if (e.touches.length !== 1) return;
          dragging = true;
          startX = e.touches[0].clientX;
          startScroll = row.scrollLeft;
        }, { passive: true });
        row.addEventListener('touchmove', function(e) {
          if (!dragging || e.touches.length !== 1) return;
          var dx = startX - e.touches[0].clientX;
          row.scrollLeft = startScroll + dx;
        }, { passive: true });
        row.addEventListener('touchend', function() {
          dragging = false;
        }, { passive: true });
      }

      /* ── Keep caret visible above toolbar when keyboard shrinks viewport ── */
      function scrollCaretIntoView() {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function() {
          requestAnimationFrame(function() {
            var sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            if (!editor.contains(sel.anchorNode)) return;
            // Con selección activa no tocamos nada: removeAllRanges/addRange
            // descarta los manejadores nativos de selección en Android
            // (rompía "Seleccionar todo" y la selección por pulsación larga).
            if (!sel.isCollapsed) return;

            var originalRange = sel.getRangeAt(0).cloneRange();
            var editorRect = editor.getBoundingClientRect();
            var toolbar = document.getElementById('toolbar');
            var toolbarH = toolbar ? toolbar.offsetHeight : 0;
            var visibleTop = editor.scrollTop + 16;
            var visibleBottom = editor.scrollTop + editor.clientHeight - toolbarH - 24;
            var marker = document.createElement('span');
            marker.textContent = '\\u200B';
            var probe = originalRange.cloneRange();
            probe.collapse(true);
            probe.insertNode(marker);
            var caretRect = marker.getBoundingClientRect();
            var caretTop = caretRect.top - editorRect.top + editor.scrollTop;
            var caretBottom = caretTop + Math.max(caretRect.height, 20);
            var restoreRange = document.createRange();
            restoreRange.setStartBefore(marker);
            restoreRange.collapse(true);
            marker.parentNode.removeChild(marker);

            if (caretBottom > visibleBottom) {
              editor.scrollTop = caretBottom - editor.clientHeight + toolbarH + 24;
            } else if (caretTop < visibleTop) {
              editor.scrollTop = Math.max(0, caretTop - 16);
            }

            sel.removeAllRanges();
            sel.addRange(restoreRange);
            savedRange = restoreRange.cloneRange();
          });
        }, 50);
      }

      /* ── Wrap selection (or typing point) in a styled span ── */
      function wrapRangeStyle(styleKey, styleValue) {
        restoreSelection();
        editor.focus();
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        var span = document.createElement('span');
        span.style[styleKey] = styleValue;

        if (range.collapsed) {
          span.appendChild(document.createTextNode('\\u200B'));
          range.insertNode(span);
          range.setStart(span.firstChild, 1);
          range.setEnd(span.firstChild, 1);
        } else {
          try {
            range.surroundContents(span);
          } catch (e) {
            var fragment = range.extractContents();
            span.appendChild(fragment);
            range.insertNode(span);
          }
          range.selectNodeContents(span);
          range.collapse(false);
        }

        sel.removeAllRanges();
        sel.addRange(range);
        savedRange = range.cloneRange();
      }

      /* ── Render color dots ──────────────────────────── */
      function renderColors() {
        var row = document.getElementById('colors-row');
        if (!row) return;
        row.innerHTML = '';
        colorPalette.forEach(function(c) {
          var dot = document.createElement('div');
          dot.className = 'color-dot' + (c.toLowerCase() === activeColor.toLowerCase() ? ' active' : '');
          dot.style.backgroundColor = c;
          dot.setAttribute('data-color', c);
          bindToolbarButton(dot, function() {
            activeColor = c;
            applyColor(c);
            renderColors();
          });
          row.appendChild(dot);
        });
      }

      /* ── Active state management for toggle buttons ── */
      function updateActiveStates() {
        var map = {
          'bold': 'bold',
          'italic': 'italic',
          'underline': 'underline',
          'strikeThrough': 'strikeThrough',
          'insertUnorderedList': 'insertUnorderedList',
          'insertOrderedList': 'insertOrderedList'
        };
        document.querySelectorAll('.tb[data-action]').forEach(function(btn) {
          var action = btn.getAttribute('data-action');
          if (!map[action]) return;
          var active = false;
          if (action === 'bold' || action === 'italic' || action === 'underline' || action === 'strikeThrough') {
            active = isFormatActive(action);
          } else {
            try { active = document.queryCommandState(action); } catch (e) {}
          }
          btn.classList.toggle('active', active);
        });

        // Size buttons
        document.querySelectorAll('.tb[data-action="size"]').forEach(function(btn) {
          var sz = btn.getAttribute('data-val');
          if (sz === activeSize) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        // Heading buttons
        var blockTag = '';
        try { blockTag = String(document.queryCommandValue('formatBlock')).toLowerCase(); } catch (e) {}
        document.querySelectorAll('.tb[data-action="heading"]').forEach(function(btn) {
          btn.classList.toggle('active', btn.getAttribute('data-val') === blockTag);
        });
      }

      /* ── Apply color to selection ──────────────────── */
      function applyColor(color) {
        activeColor = color;
        wrapRangeStyle('color', color);
        notifyChange();
      }

      /* ── Apply font size via span wrapping (works on Android WebView) ── */
      function applySize(sizeValue) {
        activeSize = sizeValue;
        wrapRangeStyle('fontSize', sizeValue);
        updateActiveStates();
        notifyChange();
        scrollCaretIntoView();
      }

      /* ── Wire up toolbar buttons ────────────────────── */
      if (!isReadOnly) {
        document.querySelectorAll('.tb[data-action]').forEach(function(btn) {
          bindToolbarButton(btn, function() {
            runToolbarAction(btn);
          });
        });

        document.querySelectorAll('.aux-btn[data-action="insertVerse"]').forEach(function(btn) {
          bindToolbarButton(btn, function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openVerseModal' }));
          });
        });

        document.querySelectorAll('.aux-btn[data-action="insertReferences"]').forEach(function(btn) {
          bindToolbarButton(btn, function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openReferenceModal' }));
          });
        });

        document.querySelectorAll('.aux-btn[data-action="insertDictionary"]').forEach(function(btn) {
          bindToolbarButton(btn, function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openDictionaryModal' }));
          });
        });

        document.querySelectorAll('.toolbar-row, .colors-row').forEach(enableHorizontalScroll);

        // Track content changes
        editor.addEventListener('input', function() {
          notifyChange();
          scrollCaretIntoView();
        });
        editor.addEventListener('focus', scrollCaretIntoView);
        
        editor.addEventListener('click', function(e) {
          var t = e.target;
          if (t && t.tagName === 'IMG') {
            var block = t.closest('.note-image-block');
            if (!block) {
              block = document.createElement('div');
              block.className = 'note-image-block';
              block.style.textAlign = 'center';
              block.style.width = '60%';
              block.style.maxWidth = '100%';
              block.style.display = 'block';
              block.style.margin = '12px auto';
              t.parentNode.insertBefore(block, t);
              block.appendChild(t);
            }
            showImageEditPanel(t, block);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          hidePanel();
          scrollCaretIntoView();
        });

        // Android: al cerrar el teclado con "atrás" el editor conserva el foco,
        // así que un tap normal ya no vuelve a mostrar el teclado. Forzamos
        // blur+focus dentro del gesto del usuario para que el IME reaparezca.
        editor.addEventListener('click', function(e) {
          if (imageEditActive) return;
          if (keyboardInset > 0) return;
          if (document.activeElement !== editor) return;
          var t = e.target;
          if (t && t.closest && t.closest('.biblia-content-block') && !t.closest('td, th')) return;
          var sel = window.getSelection();
          if (sel && sel.rangeCount > 0 && !sel.isCollapsed) return;
          var range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
          editor.blur();
          editor.focus();
          if (range) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        });

        // Track selection changes for active states + save range for toolbar
        document.addEventListener('selectionchange', function() {
          saveSelection();
          updateActiveStates();
        });

        window.addEventListener('resize', scrollCaretIntoView);

        // Render initial colors
        renderColors();

        // Initial active states
        setTimeout(updateActiveStates, 100);
        initTablePicker();
        initTableBlocks();
      }

      ${getNoteTableScript(isReadOnly)}

      if (isReadOnly) {
        wrapTablesForReadOnly();
      }

      /* ── Notify React Native ────────────────────────── */
      // Con debounce: cruzar el puente RN↔WebView con todo el HTML en cada
      // tecla se nota en notas largas. El guardado real usa getHtml, que lee
      // innerHTML directamente, así que nunca ve contenido desfasado.
      var notifyTimer = null;
      function postCurrentHtml() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'onChange',
          html: editor.innerHTML
        }));
      }

      function notifyChangeNow() {
        if (notifyTimer) {
          clearTimeout(notifyTimer);
          notifyTimer = null;
        }
        postCurrentHtml();
      }

      function notifyChange() {
        if (notifyTimer) clearTimeout(notifyTimer);
        notifyTimer = setTimeout(function() {
          notifyTimer = null;
          postCurrentHtml();
        }, 250);
      }

      /* ── Global handler for React Native injectJavaScript ── */
      window.handleAction = function(jsonStr) {
        try {
          var action = JSON.parse(jsonStr);

          if (action.type === 'getHtml') {
            if (notifyTimer) {
              clearTimeout(notifyTimer);
              notifyTimer = null;
            }
            clearImageEditingChrome();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'getHtmlResponse',
              html: editor.innerHTML
            }));
            return;
          }
          if (action.type === 'updateContent') {
            editor.innerHTML = action.value;
            return;
          }
          if (action.type === 'updateColors') {
            colorPalette = action.value;
            renderColors();
            return;
          }
          if (action.type === 'loadFonts') {
            ensureDynamicFontStyle().textContent = buildFontFaces(action.value || {});
            return;
          }
          if (action.type === 'setKeyboardInset') {
            keyboardInset = action.value || 0;
            if (keyboardInset > 0) scrollCaretIntoView();
            return;
          }
          if (action.type === 'blurEditor') {
            editor.blur();
            return;
          }

          if (action.type === 'insertImage') {
            insertHtmlAtSelection(buildImageBlockHtml(action.value), false);
            notifyChangeNow();
            return;
          }

          editor.focus();

          if (action.type === 'setFont') {
            restoreSelection();
            var fontValue = action.value === 'Default' ? 'system-ui' : action.value;
            var sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              document.execCommand('fontName', false, fontValue);
              savedRange = sel.getRangeAt(0).cloneRange();
            } else {
              editor.style.fontFamily = fontStack(action.value);
            }
            editor.style.fontFamily = fontStack(action.value);
          } else if (action.type === 'insertVerse') {
            insertHtmlAtSelection(buildVerseBlockHtml(action.value));
          } else if (action.type === 'insertReferences') {
            insertHtmlAtSelection(action.value);
          } else if (action.type === 'insertDictionary') {
            insertHtmlAtSelection(buildDictBlockHtml(action.value));
          }

          notifyChange();
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: e.message
          }));
        }
      };
    })();
  </script>
</body>
</html>`;
}
