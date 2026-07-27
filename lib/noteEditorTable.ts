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

export function getNoteTableCss(colors: NoteTableThemeColors): string {
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
}

export function getNoteTableOverlayHtml(): string {
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

export function getNoteTableScript(): string {
  return `
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
}
