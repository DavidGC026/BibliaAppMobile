// ponytail: mirror of ../../lib/note-editor-blocks.ts

export interface NoteBlockThemeColors {
  text: string
  textMuted: string
  background: string
  border: string
  accent: string
  primary: string
  primarySoft: string
}

/**
 * Bloques de contenido de las notas: versículo, diccionario y tabla.
 *
 * Estructura de un bloque:
 *
 *   <div class="biblia-content-block biblia-verse-block">
 *     <div class="biblia-block-handle" contenteditable="false"> ↑ ↓ Copiar … </div>
 *     <blockquote class="biblia-verse-quote" contenteditable="false"> … </blockquote>
 *   </div>
 *
 * El envoltorio sí es editable (las celdas de tabla necesitan caret), así que
 * el WebView puede borrarlo "a trozos": un Backspace o Delete pegado al bloque
 * se lleva la barra de botones o el nodo principal y deja un bloque inservible.
 * Este módulo concentra esa responsabilidad: reconocer bloques, mantener su
 * estructura válida (`normalizeContentBlocks`) y gestionar su selección.
 *
 * Los tipos de bloque son descriptores: añadir uno nuevo no obliga a tocar la
 * lógica de integridad ni la de selección. El descriptor de tabla lo aporta
 * `note-editor-table` a través de `tableContentBlockType()`.
 */
export function getNoteBlockCss(colors: NoteBlockThemeColors, isReadOnly: boolean): string {
  if (isReadOnly) {
    return `
    .biblia-content-block .biblia-block-handle { display: none !important; }
    .biblia-content-block { border: none; background: transparent; margin: 12px 0; }
    `
  }

  return `
    .biblia-content-block {
      margin: 0;
      border: 2px solid transparent;
      border-radius: 12px;
      position: relative;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .biblia-content-block.is-selected {
      border-color: ${colors.primary};
      box-shadow: 0 0 0 3px ${colors.primarySoft};
    }
    .biblia-block-handle {
      display: none;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      margin: -2px -2px 0;
      background: ${colors.background};
      border-bottom: 1px solid ${colors.border};
      border-radius: 10px 10px 0 0;
      user-select: none;
      -webkit-user-select: none;
    }
    .biblia-content-block.is-selected .biblia-block-handle {
      display: flex;
    }
    .biblia-block-label {
      font-size: 11px;
      font-weight: 800;
      color: ${colors.textMuted};
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .biblia-block-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .biblia-block-btn {
      border: none;
      background: ${colors.accent};
      color: ${colors.text};
      font-size: 10px;
      font-weight: 700;
      padding: 5px 7px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .biblia-block-btn[data-block-action="delete"] {
      color: #dc2626;
    }
    .biblia-verse-block blockquote.biblia-verse-quote,
    .biblia-dict-block aside.biblia-dict-entry {
      cursor: pointer;
    }
    .biblia-table-block table.biblia-note-table {
      cursor: pointer;
    }
    `
}

export function getNoteBlockScript(isReadOnly: boolean): string {
  return `
      /* ── Constructores de bloque ───────────────────── */
      function buildBlockHandleHtml(icon, label) {
        return '<div class="biblia-block-handle" contenteditable="false">' +
          '<span class="biblia-block-label">' + icon + ' ' + label + '</span>' +
          '<div class="biblia-block-actions">' +
          '<button type="button" class="biblia-block-btn" data-block-action="up" contenteditable="false">↑</button>' +
          '<button type="button" class="biblia-block-btn" data-block-action="down" contenteditable="false">↓</button>' +
          '<button type="button" class="biblia-block-btn" data-block-action="copy" contenteditable="false">Copiar</button>' +
          '<button type="button" class="biblia-block-btn" data-block-action="cut" contenteditable="false">Cortar</button>' +
          '<button type="button" class="biblia-block-btn" data-block-action="delete" contenteditable="false">Eliminar</button>' +
          '</div></div>';
      }

      var BLOCK_ACTION_COUNT = 5;

      function verseLabelFromBlockquote(bq) {
        if (!bq) return 'Versículo';
        var strong = bq.querySelector('strong');
        if (strong && strong.textContent) return strong.textContent.trim().slice(0, 72);
        var t = (bq.textContent || '').trim().replace(/\\s+/g, ' ');
        return t.slice(0, 60) || 'Versículo';
      }

      function dictLabelFromAside(aside) {
        if (!aside) return 'Diccionario';
        var code = aside.getAttribute('data-strong') || '';
        var lemmaEl = aside.querySelector('.biblia-dict-lemma');
        var lemma = lemmaEl ? lemmaEl.textContent.trim() : '';
        return code ? code + (lemma ? ' · ' + lemma : '') : 'Diccionario Strong';
      }

      function buildVerseBlockHtml(innerHtml) {
        var tmp = document.createElement('div');
        tmp.innerHTML = '<blockquote class="biblia-verse-quote" contenteditable="false">' + innerHtml + '</blockquote>';
        var bq = tmp.querySelector('blockquote');
        return '<div class="biblia-content-block biblia-verse-block">' +
          buildBlockHandleHtml('📖', verseLabelFromBlockquote(bq)) +
          bq.outerHTML + '</div><p><br></p>';
      }

      function buildDictBlockHtml(asideHtml) {
        var tmp = document.createElement('div');
        tmp.innerHTML = asideHtml;
        var aside = tmp.querySelector('aside.biblia-dict-entry') || tmp.firstElementChild;
        if (aside) {
          aside.classList.add('biblia-dict-entry');
          aside.setAttribute('contenteditable', 'false');
        }
        return '<div class="biblia-content-block biblia-dict-block">' +
          buildBlockHandleHtml('📚', dictLabelFromAside(aside)) +
          (aside ? aside.outerHTML : asideHtml) + '</div><p><br></p>';
      }

      /* ── Tipos de bloque ───────────────────────────── */
      function coreContentBlockTypes() {
        return [
          {
            blockClass: 'biblia-verse-block',
            mainSelector: 'blockquote',
            mainTag: 'BLOCKQUOTE',
            icon: '📖',
            label: verseLabelFromBlockquote,
            eligible: function(el) { return !el.closest('.biblia-table-compact-preview'); },
            prepare: function(main) {
              main.classList.add('biblia-verse-quote');
              main.setAttribute('contenteditable', 'false');
            }
          },
          {
            blockClass: 'biblia-dict-block',
            mainSelector: 'aside.biblia-dict-entry',
            mainTag: 'ASIDE',
            icon: '📚',
            label: dictLabelFromAside,
            eligible: function() { return true; },
            prepare: function(main) {
              main.classList.add('biblia-dict-entry');
              main.setAttribute('contenteditable', 'false');
            }
          }
        ];
      }

      var contentBlockTypesCache = null;

      function contentBlockTypes() {
        if (contentBlockTypesCache) return contentBlockTypesCache;
        var types = coreContentBlockTypes();
        // Las tablas viven en su propio módulo y aportan su descriptor.
        if (typeof tableContentBlockType === 'function') types.push(tableContentBlockType());
        contentBlockTypesCache = types;
        return types;
      }

      // Notas antiguas pueden no tener las clases: el fallback por etiqueta
      // evita tratar un bloque válido como envoltorio vacío.
      var LEGACY_MAIN_SELECTOR = 'table, blockquote, aside';

      function contentBlockTypeFor(block) {
        var types = contentBlockTypes();
        var i;
        for (i = 0; i < types.length; i++) {
          if (block.classList.contains(types[i].blockClass)) return types[i];
        }
        for (i = 0; i < types.length; i++) {
          if (block.querySelector(types[i].mainSelector)) return types[i];
        }
        return null;
      }

      function contentBlockTypeForMain(main) {
        var types = contentBlockTypes();
        for (var i = 0; i < types.length; i++) {
          if (main.tagName === types[i].mainTag) return types[i];
        }
        return null;
      }

      function blockMainNode(block) {
        if (!block) return null;
        var type = contentBlockTypeFor(block);
        if (type) {
          var main = block.querySelector(type.mainSelector);
          if (main) return main;
        }
        return block.querySelector(LEGACY_MAIN_SELECTOR);
      }
      ${
        isReadOnly
          ? ''
          : `
      var selectedContentBlock = null;

      function clearContentBlockSelection() {
        if (selectedContentBlock) selectedContentBlock.classList.remove('is-selected');
        selectedContentBlock = null;
      }

      function selectContentBlock(block) {
        clearContentBlockSelection();
        selectedContentBlock = block;
        block.classList.add('is-selected');
      }

      /* ── Utilidades de recorrido ───────────────────── */
      function isBlankTextNode(node) {
        return node.nodeType === 3 && !node.textContent.replace(/\\u200B/g, '').trim();
      }

      function isContentBlock(node) {
        return !!node && node.nodeType === 1 && node.classList.contains('biblia-content-block');
      }

      // Hermano relevante: ignora los nodos de texto en blanco del formateo.
      function meaningfulSibling(node, forward) {
        var s = forward ? node.nextSibling : node.previousSibling;
        while (s && isBlankTextNode(s)) s = forward ? s.nextSibling : s.previousSibling;
        return s || null;
      }

      function newParagraph() {
        var p = document.createElement('p');
        p.appendChild(document.createElement('br'));
        return p;
      }

      function placeCaretIn(node, atStart) {
        if (!node) return;
        if (document.activeElement !== editor) editor.focus();
        var range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(!!atStart);
        var sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
      }

      /* ── Integridad de los bloques ─────────────────────────────
         El editor del WebView borra a trozos: un Backspace o Delete junto a un
         bloque puede llevarse la barra de botones (y entonces no hay forma de
         moverlo ni eliminarlo, porque solo aparece al seleccionarlo) o el nodo
         principal (y queda un envoltorio invisible que atrapa el caret). Ese
         HTML roto se guardaba en la nota, así que el bloque quedaba inservible
         para siempre. Aquí se rehace lo que falte. */
      function contentBlockHandles(block) {
        var out = [];
        for (var i = 0; i < block.children.length; i++) {
          if (block.children[i].classList.contains('biblia-block-handle')) out.push(block.children[i]);
        }
        return out;
      }

      // Texto que el WebView metió dentro del envoltorio al fusionar párrafos:
      // se saca detrás del bloque para no perderlo ni dejarlo inaccesible.
      function moveStrayNodesOutOfBlock(block, main) {
        var strays = [];
        for (var i = 0; i < block.childNodes.length; i++) {
          var node = block.childNodes[i];
          if (node === main) continue;
          if (node.nodeType === 1 && node.classList.contains('biblia-block-handle')) continue;
          if (isBlankTextNode(node)) continue;
          strays.push(node);
        }
        if (!strays.length) return false;
        var anchor = block;
        strays.forEach(function(node) {
          if (node.nodeType === 1 && node.tagName === 'BR') {
            node.remove();
            return;
          }
          if (block.parentNode) block.parentNode.insertBefore(node, anchor.nextSibling);
          anchor = node;
        });
        return true;
      }

      function repairContentBlock(block) {
        var main = blockMainNode(block);
        if (!main) {
          // Envoltorio sin contenido: el borrado se llevó el nodo principal.
          // Se rescata lo que el usuario haya escrito dentro antes de tirarlo.
          moveStrayNodesOutOfBlock(block, null);
          if (block === selectedContentBlock) clearContentBlockSelection();
          block.remove();
          return true;
        }

        var type = contentBlockTypeFor(block) || contentBlockTypeForMain(main);
        if (!type) return false;

        var changed = false;
        if (!block.classList.contains(type.blockClass)) {
          block.classList.add(type.blockClass);
          changed = true;
        }
        if (type.prepare) type.prepare(main);

        var handles = contentBlockHandles(block);
        for (var i = 1; i < handles.length; i++) {
          handles[i].remove();
          changed = true;
        }
        var handle = handles[0] || null;
        if (handle && handle.querySelectorAll('[data-block-action]').length < BLOCK_ACTION_COUNT) {
          handle.remove();
          handle = null;
          changed = true;
        }
        if (!handle) {
          block.insertAdjacentHTML('afterbegin', buildBlockHandleHtml(type.icon, type.label(main)));
          changed = true;
        } else if (block.firstElementChild !== handle) {
          block.insertBefore(handle, block.firstChild);
          changed = true;
        }

        return moveStrayNodesOutOfBlock(block, main) || changed;
      }

      // Envuelve nodos principales sueltos (contenido pegado, notas antiguas).
      function wrapLooseContentBlocks() {
        var changed = false;
        contentBlockTypes().forEach(function(type) {
          editor.querySelectorAll(type.mainSelector).forEach(function(main) {
            if (main.closest('.biblia-content-block')) return;
            if (type.eligible && !type.eligible(main)) return;
            var block = document.createElement('div');
            block.className = 'biblia-content-block ' + type.blockClass;
            if (type.prepare) type.prepare(main);
            block.innerHTML = buildBlockHandleHtml(type.icon, type.label(main));
            main.parentNode.insertBefore(block, main);
            block.appendChild(main);
            changed = true;
          });
        });
        return changed;
      }

      // Un bloque pegado al borde del editor (o a otro bloque) deja al usuario
      // sin sitio donde poner el caret: no se puede escribir encima ni debajo.
      function ensureContentBlockEdges() {
        var changed = false;
        editor.querySelectorAll('.biblia-content-block').forEach(function(block) {
          if (block.parentNode !== editor) return;
          if (!meaningfulSibling(block, false)) {
            editor.insertBefore(newParagraph(), block);
            changed = true;
          }
          var next = meaningfulSibling(block, true);
          if (!next || isContentBlock(next)) {
            editor.insertBefore(newParagraph(), block.nextSibling);
            changed = true;
          }
        });
        return changed;
      }

      // Punto único de reparación. Devuelve true si tocó el DOM.
      function normalizeContentBlocks() {
        var changed = wrapLooseContentBlocks();
        var blocks = editor.querySelectorAll('.biblia-content-block');
        for (var i = 0; i < blocks.length; i++) {
          if (repairContentBlock(blocks[i])) changed = true;
        }
        if (ensureContentBlockEdges()) changed = true;
        return changed;
      }

      // Reparación durante la edición: conserva el caret y avisa al host.
      function normalizeContentBlocksLive() {
        var sel = window.getSelection();
        var range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
        if (!normalizeContentBlocks()) return;
        if (range && editor.contains(range.startContainer)) {
          try {
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e) {}
        }
        notifyChange();
        if (typeof commitHistory === 'function') commitHistory();
      }

      /* ── Acciones de la barra del bloque ───────────── */
      function moveContentBlock(block, direction) {
        if (!block || !block.parentNode) return;
        var sibling = direction === 'up' ? block.previousElementSibling : block.nextElementSibling;
        while (sibling && sibling.tagName === 'P' && !(sibling.textContent || '').replace(/\\u200B/g, '').trim()) {
          sibling = direction === 'up' ? sibling.previousElementSibling : sibling.nextElementSibling;
        }
        if (!sibling) return;
        if (direction === 'up') {
          block.parentNode.insertBefore(block, sibling);
        } else {
          block.parentNode.insertBefore(sibling, block);
        }
        selectContentBlock(block);
        normalizeContentBlocks();
        notifyChange();
        if (typeof commitHistory === 'function') commitHistory();
        scrollCaretIntoView();
      }

      function removeContentBlock(block) {
        if (!block || !block.parentNode) return;
        // Dejar el caret donde estaba el bloque para poder seguir escribiendo.
        var landing = meaningfulSibling(block, true);
        var landAtStart = true;
        if (!landing || isContentBlock(landing) || landing.nodeType !== 1) {
          landing = meaningfulSibling(block, false);
          landAtStart = false;
        }
        block.remove();
        clearContentBlockSelection();
        if (landing && landing.nodeType === 1 && !isContentBlock(landing)) {
          placeCaretIn(landing, landAtStart);
        }
        normalizeContentBlocks();
        notifyChange();
        if (typeof commitHistory === 'function') commitHistory();
        scrollCaretIntoView();
      }

      /* Copiar/Cortar tienen que llevar el bloque a la selección del documento:
         sin eso execCommand('copy') copiaba lo que hubiera seleccionado antes
         (normalmente nada) y el botón parecía no hacer nada. */
      function copyContentBlock(block) {
        var main = blockMainNode(block);
        if (!main) return;
        var sel = window.getSelection();
        var previous = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
        var copied = false;
        try {
          var range = document.createRange();
          range.selectNode(main);
          sel.removeAllRanges();
          sel.addRange(range);
          copied = document.execCommand('copy');
        } catch (e) {}
        try {
          sel.removeAllRanges();
          if (previous) sel.addRange(previous);
        } catch (e) {}
        if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
          try { navigator.clipboard.writeText((main.textContent || '').trim()); } catch (e) {}
        }
        selectContentBlock(block);
      }

      function cutContentBlock(block) {
        copyContentBlock(block);
        removeContentBlock(block);
      }

      // Sitio editable justo después del bloque (crearlo si no existe).
      function focusAfterContentBlock(block) {
        var next = meaningfulSibling(block, true);
        if (!next || next.nodeType !== 1 || isContentBlock(next)) {
          next = newParagraph();
          block.parentNode.insertBefore(next, block.nextSibling);
          notifyChange();
        }
        clearContentBlockSelection();
        placeCaretIn(next, true);
        scrollCaretIntoView();
      }

      function handleContentBlockAction(block, action) {
        if (!block) return;
        if (action === 'up') moveContentBlock(block, 'up');
        else if (action === 'down') moveContentBlock(block, 'down');
        else if (action === 'copy') copyContentBlock(block);
        else if (action === 'cut') cutContentBlock(block);
        else if (action === 'delete') removeContentBlock(block);
      }

      /* ── Selección por toque ───────────────────────── */
      function trySelectContentBlockFromTarget(target) {
        if (!target || !target.closest) return false;
        var block = target.closest('.biblia-content-block');
        if (!block) return false;
        // La barra gestiona sus propios botones.
        if (target.closest('.biblia-block-handle')) return false;

        // En una tabla, el segundo toque sobre la celda suelta la selección
        // para poder escribir dentro.
        if (target.closest('td, th') && block.classList.contains('is-selected')) {
          clearContentBlockSelection();
          return true;
        }

        selectContentBlock(block);
        return true;
      }

      /* ── Teclado ───────────────────────────────────── */
      function caretHostElement() {
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        var node = sel.getRangeAt(0).startContainer;
        if (!node || !editor.contains(node)) return null;
        return node.nodeType === 1 ? node : node.parentNode;
      }

      // El caret está dentro del contenido del bloque (celda de tabla): ahí el
      // borrado tiene que ser el normal, carácter a carácter.
      function caretInsideBlockMain(block) {
        var host = caretHostElement();
        if (!host) return false;
        var main = blockMainNode(block);
        return !!main && (host === main || main.contains(host));
      }

      function topLevelNode(node) {
        while (node && node.parentNode && node.parentNode !== editor) node = node.parentNode;
        return node && node.parentNode === editor ? node : null;
      }

      // ¿El caret está al principio (o al final) de su nodo de primer nivel?
      function isCaretAtNodeEdge(node, range, atStart) {
        var probe = document.createRange();
        try {
          if (atStart) {
            probe.setStart(node, 0);
            probe.setEnd(range.startContainer, range.startOffset);
          } else {
            probe.setStart(range.endContainer, range.endOffset);
            probe.setEndAfter(node);
          }
        } catch (e) {
          return false;
        }
        var holder = document.createElement('div');
        holder.appendChild(probe.cloneContents());
        if (holder.querySelector('img, table, blockquote, aside, .note-image-block')) return false;
        return !holder.textContent.replace(/\\u200B/g, '').trim();
      }

      // Bloque que un Backspace/Delete se llevaría por delante.
      function contentBlockAtCaretEdge(direction) {
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        var range = sel.getRangeAt(0);
        if (!range.collapsed || !editor.contains(range.startContainer)) return null;

        var host = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentNode;
        var inside = host && host.closest ? host.closest('.biblia-content-block') : null;
        if (inside && editor.contains(inside)) {
          // Caret atrapado en el envoltorio (entre la barra y el contenido):
          // el borrado nativo desde ahí es justo el que rompe el bloque.
          return caretInsideBlockMain(inside) ? null : inside;
        }

        var node = topLevelNode(range.startContainer);
        if (!node) return null;
        if (isContentBlock(node)) return node;
        if (!isCaretAtNodeEdge(node, range, direction === 'back')) return null;

        var sibling = meaningfulSibling(node, direction !== 'back');
        return isContentBlock(sibling) ? sibling : null;
      }

      /* Borrado junto a un bloque.
         Primer intento: seleccionarlo, así aparecen sus botones y se ve qué se
         va a borrar. El segundo lo elimina completo, en vez de dejar que el
         WebView lo desmonte a trozos. Devuelve true si se ocupó del borrado. */
      function handleContentBlockDeleteIntent(direction) {
        if (selectedContentBlock && !caretInsideBlockMain(selectedContentBlock)) {
          removeContentBlock(selectedContentBlock);
          return true;
        }
        var block = contentBlockAtCaretEdge(direction);
        if (!block) return false;
        selectContentBlock(block);
        scrollCaretIntoView();
        return true;
      }

      function handleContentBlockKeydown(e) {
        if (e.key === 'Escape') {
          if (!selectedContentBlock) return;
          e.preventDefault();
          clearContentBlockSelection();
          return;
        }

        if (e.key === 'Enter' && selectedContentBlock && !caretInsideBlockMain(selectedContentBlock)) {
          e.preventDefault();
          focusAfterContentBlock(selectedContentBlock);
          return;
        }

        if (e.key !== 'Backspace' && e.key !== 'Delete') return;
        if (handleContentBlockDeleteIntent(e.key === 'Backspace' ? 'back' : 'forward')) e.preventDefault();
      }

      /* Android no siempre manda keydown al borrar (el teclado predictivo usa
         beforeinput), así que la misma protección se engancha en los dos. */
      function handleContentBlockBeforeInput(e) {
        if (e.inputType !== 'deleteContentBackward' && e.inputType !== 'deleteContentForward') return;
        if (handleContentBlockDeleteIntent(e.inputType === 'deleteContentForward' ? 'forward' : 'back')) {
          e.preventDefault();
        }
      }

      function initContentBlocks() {
        normalizeContentBlocks();
        if (editor._bibliaContentBlocksInit) return;
        editor._bibliaContentBlocksInit = true;

        editor.addEventListener('click', function(e) {
          var actionBtn = e.target.closest('[data-block-action]');
          if (actionBtn) {
            e.preventDefault();
            e.stopPropagation();
            handleContentBlockAction(
              actionBtn.closest('.biblia-content-block'),
              actionBtn.getAttribute('data-block-action')
            );
            return;
          }
          if (trySelectContentBlockFromTarget(e.target)) {
            e.preventDefault();
            return;
          }
          if (!e.target.closest('.biblia-content-block')) clearContentBlockSelection();
        });

        editor.addEventListener('keydown', handleContentBlockKeydown);
        editor.addEventListener('beforeinput', handleContentBlockBeforeInput);
        editor.addEventListener('input', function() {
          // Escribir cancela la selección del bloque.
          clearContentBlockSelection();
          normalizeContentBlocksLive();
        });
      }
      `
      }
  `
}
