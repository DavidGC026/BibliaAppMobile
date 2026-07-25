// ponytail: mirror of ../../lib/note-editor-table.ts

export interface NoteTableThemeColors {
  text: string
  textMuted: string
  background: string
  card: string
  border: string
  accent: string
  primary: string
  primarySoft: string
}

export function getNoteTableCss(colors: NoteTableThemeColors, isReadOnly: boolean): string {
  return `
    table.biblia-note-table {
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
      border-radius: 8px;
      overflow: hidden;
    }
    table.biblia-note-table, table.biblia-note-table th, table.biblia-note-table td {
      border: 1px solid ${colors.border};
    }
    table.biblia-note-table th, table.biblia-note-table td {
      padding: 8px 12px;
      text-align: left;
      font-size: 14px;
      vertical-align: top;
    }
    table.biblia-note-table th {
      background: ${colors.accent};
      font-weight: 700;
    }

    ${
      isReadOnly
        ? `
    .biblia-table-widget { margin: 12px 0; }
    .biblia-table-compact {
      border: 1px solid ${colors.border};
      border-radius: 12px;
      background: ${colors.card};
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .biblia-table-compact:active { opacity: 0.85; }
    .biblia-table-compact-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .biblia-table-compact-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: ${colors.primarySoft};
      color: ${colors.primary};
      font-size: 14px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .biblia-table-compact-title {
      font-size: 13px;
      font-weight: 800;
      color: ${colors.text};
    }
    .biblia-table-compact-meta {
      font-size: 11px;
      color: ${colors.textMuted};
      margin-left: auto;
    }
    .biblia-table-compact-preview {
      overflow: hidden;
      max-height: 88px;
      pointer-events: none;
    }
    .biblia-table-compact-preview table {
      margin: 0;
      font-size: 11px;
    }
    .biblia-table-compact-preview th,
    .biblia-table-compact-preview td {
      padding: 4px 6px !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }
    .biblia-table-source { display: none !important; }

    .biblia-table-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .biblia-table-overlay.open { display: flex; }
    .biblia-table-overlay-card {
      width: min(100%, 640px);
      max-height: min(85vh, 720px);
      background: ${colors.card};
      border: 1px solid ${colors.border};
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
    }
    .biblia-table-overlay-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid ${colors.border};
      background: ${colors.background};
      font-size: 14px;
      font-weight: 800;
      color: ${colors.text};
    }
    .biblia-table-overlay-close {
      border: none;
      background: ${colors.accent};
      color: ${colors.text};
      width: 32px;
      height: 32px;
      border-radius: 999px;
      font-size: 16px;
      cursor: pointer;
    }
    .biblia-table-overlay-body {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding: 12px 14px 16px;
    }
    .biblia-table-overlay-body table {
      margin: 0;
    }
    `
        : `
    .table-picker-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.45);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .table-picker-overlay.open { display: flex; }
    .table-picker-card {
      width: min(100%, 320px);
      background: ${colors.card};
      border: 1px solid ${colors.border};
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
    }
    .table-picker-title {
      font-size: 15px;
      font-weight: 800;
      color: ${colors.text};
      margin-bottom: 12px;
    }
    .table-picker-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 13px;
      color: ${colors.text};
    }
    .table-picker-field input[type="number"] {
      width: 72px;
      height: 36px;
      border: 1px solid ${colors.border};
      border-radius: 8px;
      background: ${colors.background};
      color: ${colors.text};
      text-align: center;
      font-size: 14px;
      font-weight: 700;
    }
    .table-picker-check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: ${colors.textMuted};
      margin: 8px 0 12px;
    }
    .table-picker-preview {
      display: grid;
      gap: 3px;
      margin-bottom: 14px;
      padding: 10px;
      border-radius: 10px;
      background: ${colors.background};
      border: 1px dashed ${colors.border};
      min-height: 72px;
    }
    .table-picker-cell {
      background: ${colors.accent};
      border-radius: 4px;
      min-height: 14px;
    }
    .table-picker-cell.head { background: ${colors.primarySoft}; }
    .table-picker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .table-picker-btn {
      border: none;
      border-radius: 10px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .table-picker-btn.cancel {
      background: ${colors.accent};
      color: ${colors.text};
    }
    .table-picker-btn.insert {
      background: ${colors.primary};
      color: #fff;
    }
    `
    }
  `
}

export function getNoteTablePickerHtml(isReadOnly: boolean): string {
  if (isReadOnly) {
    return `<div id="biblia-table-overlay" class="biblia-table-overlay" aria-hidden="true">
      <div class="biblia-table-overlay-card">
        <div class="biblia-table-overlay-head">
          <span id="biblia-table-overlay-title">Tabla</span>
          <button type="button" class="biblia-table-overlay-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="biblia-table-overlay-body" id="biblia-table-overlay-body"></div>
      </div>
    </div>`
  }

  return `<div id="table-picker" class="table-picker-overlay" aria-hidden="true">
    <div class="table-picker-card">
      <div class="table-picker-title">Insertar tabla</div>
      <label class="table-picker-field">
        <span>Columnas</span>
        <input type="number" id="tp-cols" min="1" max="10" value="3" inputmode="numeric">
      </label>
      <label class="table-picker-field">
        <span>Filas</span>
        <input type="number" id="tp-rows" min="1" max="20" value="3" inputmode="numeric">
      </label>
      <label class="table-picker-check">
        <input type="checkbox" id="tp-header" checked>
        <span>Primera fila como encabezado</span>
      </label>
      <div class="table-picker-preview" id="tp-preview"></div>
      <div class="table-picker-actions">
        <button type="button" class="table-picker-btn cancel" id="tp-cancel">Cancelar</button>
        <button type="button" class="table-picker-btn insert" id="tp-insert">Insertar</button>
      </div>
    </div>
  </div>`
}

export function getNoteTableScript(isReadOnly: boolean): string {
  return `
      function clampTableNum(value, min, max, fallback) {
        var n = parseInt(value, 10);
        if (isNaN(n)) return fallback;
        return Math.max(min, Math.min(max, n));
      }

      function buildTableInnerHtml(cols, rows, withHeader) {
        cols = clampTableNum(cols, 1, 10, 3);
        rows = clampTableNum(rows, 1, 20, 3);
        var html = '<table class="biblia-note-table">';
        var r, c;
        if (withHeader) {
          html += '<thead><tr>';
          for (c = 0; c < cols; c++) html += '<th>Col ' + (c + 1) + '</th>';
          html += '</tr></thead><tbody>';
          for (r = 1; r < rows; r++) {
            html += '<tr>';
            for (c = 0; c < cols; c++) html += '<td>&nbsp;</td>';
            html += '</tr>';
          }
          html += '</tbody>';
        } else {
          html += '<tbody>';
          for (r = 0; r < rows; r++) {
            html += '<tr>';
            for (c = 0; c < cols; c++) html += '<td>&nbsp;</td>';
            html += '</tr>';
          }
          html += '</tbody>';
        }
        html += '</table>';
        return html;
      }

      function tableBlockLabel(table) {
        var rows = table.rows.length;
        var cols = rows > 0 ? table.rows[0].cells.length : 0;
        return 'Tabla ' + cols + '×' + rows;
      }

      function buildTableHandleHtml(label) {
        return buildBlockHandleHtml('⊞', label);
      }

      /* ── Filas y columnas de una tabla ya insertada ──
         Se respetan los mismos límites que el selector de inserción (hasta 10
         columnas y 20 filas) y no se deja la tabla sin ninguna fila ni columna:
         para eso está «Eliminar» en la barra del bloque. */
      var TABLE_MAX_COLS = 10;
      var TABLE_MAX_ROWS = 20;

      function tableColumnCount(table) {
        var cols = 0;
        for (var r = 0; r < table.rows.length; r++) {
          cols = Math.max(cols, table.rows[r].cells.length);
        }
        return cols;
      }

      function isHeaderRow(row) {
        return !!(row.parentNode && row.parentNode.tagName === 'THEAD');
      }

      function newTableCell(row) {
        var head = isHeaderRow(row);
        var cell = document.createElement(head ? 'th' : 'td');
        cell.innerHTML = head ? 'Col' : '&nbsp;';
        return cell;
      }

      /* Celda de referencia: la última que tocó el usuario, para que la fila o
         columna nueva aparezca junto a ella y no siempre al final. */
      function tableCellFromContext(table, context) {
        var target = context && context.target;
        if (!target || !target.closest) return null;
        var cell = target.closest('td, th');
        return cell && table.contains(cell) ? cell : null;
      }

      function addTableRow(table, cell) {
        if (table.rows.length >= TABLE_MAX_ROWS) return false;
        var cols = tableColumnCount(table) || 1;
        var at = cell ? Math.min(cell.parentNode.rowIndex + 1, table.rows.length) : table.rows.length;
        var row = table.insertRow(at);
        for (var i = 0; i < cols; i++) row.appendChild(newTableCell(row));
        return true;
      }

      function removeTableRow(table, cell) {
        if (table.rows.length <= 1) return false;
        var at = cell ? cell.parentNode.rowIndex : table.rows.length - 1;
        table.deleteRow(at);
        return true;
      }

      function addTableColumn(table, cell) {
        if (tableColumnCount(table) >= TABLE_MAX_COLS) return false;
        var at = cell ? cell.cellIndex + 1 : tableColumnCount(table);
        for (var r = 0; r < table.rows.length; r++) {
          var row = table.rows[r];
          row.insertBefore(newTableCell(row), row.cells[at] || null);
        }
        return true;
      }

      function removeTableColumn(table, cell) {
        if (tableColumnCount(table) <= 1) return false;
        var at = cell ? cell.cellIndex : tableColumnCount(table) - 1;
        for (var r = 0; r < table.rows.length; r++) {
          var row = table.rows[r];
          if (row.cells[at]) row.deleteCell(at);
        }
        return true;
      }

      // Descriptor que consume note-editor-blocks: la tabla es un bloque de
      // contenido más, pero solo este módulo sabe cómo etiquetarla, qué tablas
      // quedan fuera (la vista compacta de solo lectura) y qué acciones
      // propias ofrece en la barra del bloque.
      function tableContentBlockType() {
        return {
          blockClass: 'biblia-table-block',
          mainSelector: 'table',
          mainTag: 'TABLE',
          icon: '⊞',
          label: tableBlockLabel,
          eligible: function(el) {
            return !el.closest('.biblia-table-widget') && !el.closest('.biblia-table-compact-preview');
          },
          prepare: function(main) {
            if (!main.classList.contains('biblia-note-table')) main.classList.add('biblia-note-table');
          },
          actions: [
            { action: 'table-row-add', label: '+ Fila' },
            { action: 'table-row-del', label: '− Fila' },
            { action: 'table-col-add', label: '+ Col' },
            { action: 'table-col-del', label: '− Col' }
          ],
          // Devuelve true si cambió la tabla (el módulo de bloques se encarga
          // entonces de la etiqueta, el historial y avisar al host).
          runAction: function(table, action, context) {
            var cell = tableCellFromContext(table, context);
            if (action === 'table-row-add') return addTableRow(table, cell);
            if (action === 'table-row-del') return removeTableRow(table, cell);
            if (action === 'table-col-add') return addTableColumn(table, cell);
            if (action === 'table-col-del') return removeTableColumn(table, cell);
            return false;
          }
        };
      }

      function buildTableHtml(cols, rows, withHeader) {
        var tableHtml = buildTableInnerHtml(cols, rows, withHeader);
        var tmp = document.createElement('div');
        tmp.innerHTML = tableHtml;
        var table = tmp.querySelector('table');
        var label = table ? tableBlockLabel(table) : 'Tabla';
        return '<div class="biblia-content-block biblia-table-block">' + buildTableHandleHtml(label) + tableHtml + '</div><p><br></p>';
      }

      ${
        isReadOnly
          ? `
      function tableSizeLabel(table) {
        var rows = table.rows.length;
        var cols = rows > 0 ? table.rows[0].cells.length : 0;
        return cols + ' × ' + rows;
      }

      function buildCompactPreview(table) {
        var clone = table.cloneNode(true);
        clone.classList.add('biblia-note-table');
        while (clone.rows.length > 3) clone.deleteRow(3);
        return clone.outerHTML;
      }

      function openTableOverlay(table, label) {
        var overlay = document.getElementById('biblia-table-overlay');
        var body = document.getElementById('biblia-table-overlay-body');
        var title = document.getElementById('biblia-table-overlay-title');
        if (!overlay || !body) return;
        body.innerHTML = '';
        var full = table.cloneNode(true);
        full.classList.add('biblia-note-table');
        body.appendChild(full);
        if (title) title.textContent = label || 'Tabla';
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
      }

      function closeTableOverlay() {
        var overlay = document.getElementById('biblia-table-overlay');
        if (!overlay) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
      }

      function wrapTablesForReadOnly() {
        var overlay = document.getElementById('biblia-table-overlay');
        if (overlay) {
          overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeTableOverlay();
          });
          var closeBtn = overlay.querySelector('.biblia-table-overlay-close');
          if (closeBtn) closeBtn.addEventListener('click', closeTableOverlay);
        }

        var tables = editor.querySelectorAll('table');
        tables.forEach(function(table, index) {
          if (table.closest('.biblia-table-widget') || table.closest('.biblia-table-compact-preview')) return;
          var block = table.closest('.biblia-content-block');
          var mountTarget = block || table;
          if (mountTarget.closest('.biblia-table-widget')) return;
          if (!table.classList.contains('biblia-note-table')) table.classList.add('biblia-note-table');

          var widget = document.createElement('div');
          widget.className = 'biblia-table-widget';

          var compact = document.createElement('div');
          compact.className = 'biblia-table-compact';
          compact.setAttribute('role', 'button');
          compact.setAttribute('tabindex', '0');

          var head = document.createElement('div');
          head.className = 'biblia-table-compact-head';
          head.innerHTML =
            '<span class="biblia-table-compact-icon">⊞</span>' +
            '<span class="biblia-table-compact-title">Tabla ' + (index + 1) + '</span>' +
            '<span class="biblia-table-compact-meta">' + tableSizeLabel(table) + ' · Toca para ampliar</span>';

          var preview = document.createElement('div');
          preview.className = 'biblia-table-compact-preview';
          preview.innerHTML = buildCompactPreview(table);

          compact.appendChild(head);
          compact.appendChild(preview);

          var open = function() {
            openTableOverlay(table, 'Tabla ' + tableSizeLabel(table));
          };
          compact.addEventListener('click', open);
          compact.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          });

          table.classList.add('biblia-table-source');
          mountTarget.parentNode.insertBefore(widget, mountTarget);
          widget.appendChild(compact);
          widget.appendChild(mountTarget);
        });

        setTimeout(function() {
          var h = document.documentElement.scrollHeight || document.body.scrollHeight;
          var payload = JSON.stringify({ type: 'onHeightChange', height: h });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(payload);
          } else if (window.parent) {
            window.parent.postMessage(payload, '*');
          }
        }, 80);
      }
      `
          : `
      function renderTablePickerPreview() {
        var preview = document.getElementById('tp-preview');
        var colsInput = document.getElementById('tp-cols');
        var rowsInput = document.getElementById('tp-rows');
        var headerInput = document.getElementById('tp-header');
        if (!preview || !colsInput || !rowsInput || !headerInput) return;

        var cols = clampTableNum(colsInput.value, 1, 10, 3);
        var rows = clampTableNum(rowsInput.value, 1, 20, 3);
        var withHeader = !!headerInput.checked;
        colsInput.value = String(cols);
        rowsInput.value = String(rows);

        preview.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        preview.innerHTML = '';
        var total = rows * cols;
        for (var i = 0; i < total; i++) {
          var cell = document.createElement('div');
          cell.className = 'table-picker-cell' + (withHeader && i < cols ? ' head' : '');
          preview.appendChild(cell);
        }
      }

      function closeTablePicker() {
        var picker = document.getElementById('table-picker');
        if (picker) {
          picker.classList.remove('open');
          picker.setAttribute('aria-hidden', 'true');
        }
      }

      function openTablePicker() {
        var picker = document.getElementById('table-picker');
        if (!picker) return;
        renderTablePickerPreview();
        picker.classList.add('open');
        picker.setAttribute('aria-hidden', 'false');
      }

      function confirmTablePicker() {
        var colsInput = document.getElementById('tp-cols');
        var rowsInput = document.getElementById('tp-rows');
        var headerInput = document.getElementById('tp-header');
        if (!colsInput || !rowsInput || !headerInput) return;
        insertHtmlAtSelection(buildTableHtml(colsInput.value, rowsInput.value, headerInput.checked));
        // insertHTML puede anidar o partir el bloque recién insertado.
        normalizeContentBlocks();
        notifyChange();
        scrollCaretIntoView();
        closeTablePicker();
      }

      function initTablePicker() {
        var picker = document.getElementById('table-picker');
        if (!picker) return;
        ['tp-cols', 'tp-rows'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.addEventListener('input', renderTablePickerPreview);
        });
        var headerInput = document.getElementById('tp-header');
        if (headerInput) headerInput.addEventListener('change', renderTablePickerPreview);
        var cancelBtn = document.getElementById('tp-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', closeTablePicker);
        var insertBtn = document.getElementById('tp-insert');
        if (insertBtn) insertBtn.addEventListener('click', confirmTablePicker);
        picker.addEventListener('click', function(e) {
          if (e.target === picker) closeTablePicker();
        });
      }

      `
      }
  `
}
