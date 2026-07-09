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
    activeFont === 'Default' ? 'system-ui, sans-serif' : `'${activeFont}', sans-serif`;

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
        <button class="aux-btn" data-action="insertVerse">📖 Insertar versículo</button>
        <button class="aux-btn aux-btn-dict" data-action="insertDictionary">📚 Insertar del diccionario</button>
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

      function insertHtmlAtSelection(html) {
        restoreSelection();
        editor.focus();
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
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
        editor.addEventListener('click', scrollCaretIntoView);

        // Android: al cerrar el teclado con "atrás" el editor conserva el foco,
        // así que un tap normal ya no vuelve a mostrar el teclado. Forzamos
        // blur+focus dentro del gesto del usuario para que el IME reaparezca.
        editor.addEventListener('click', function(e) {
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
      function notifyChange() {
        if (notifyTimer) clearTimeout(notifyTimer);
        notifyTimer = setTimeout(function() {
          notifyTimer = null;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'onChange',
            html: editor.innerHTML
          }));
        }, 250);
      }

      /* ── Global handler for React Native injectJavaScript ── */
      window.handleAction = function(jsonStr) {
        try {
          var action = JSON.parse(jsonStr);

          if (action.type === 'getHtml') {
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
          if (action.type === 'setKeyboardInset') {
            keyboardInset = action.value || 0;
            if (keyboardInset > 0) scrollCaretIntoView();
            return;
          }
          if (action.type === 'blurEditor') {
            editor.blur();
            return;
          }

          editor.focus();

          if (action.type === 'setFont') {
            var sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
              document.execCommand('fontName', false, action.value);
            } else {
              editor.style.fontFamily = action.value === 'Default' ? 'system-ui, sans-serif' : "'" + action.value + "', sans-serif";
            }
          } else if (action.type === 'insertVerse') {
            insertHtmlAtSelection(buildVerseBlockHtml(action.value));
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
