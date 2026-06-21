import { AppColors } from '@/constants/Colors';

export function getEditorHtml(
  colors: AppColors,
  initialContent: string,
  activeFont: string,
  base64Fonts: Record<string, string>,
  isReadOnly = false
): string {
  // Generate CSS rules for offline loaded fonts
  let fontsCss = '';
  Object.keys(base64Fonts).forEach((fontId) => {
    const base64Data = base64Fonts[fontId];
    if (base64Data) {
      fontsCss += `
        @font-face {
          font-family: '${fontId}';
          src: url('data:font/ttf;base64,${base64Data}') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
      `;
    }
  });

  const fontStyleFamily = activeFont === 'Default' ? 'sans-serif' : `'${activeFont}', sans-serif`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        ${fontsCss}

        body {
          margin: 0;
          padding: ${isReadOnly ? '0px' : '16px'};
          background-color: ${isReadOnly ? 'transparent' : colors.background};
          color: ${colors.text};
          font-family: ${fontStyleFamily};
          font-size: 16px;
          line-height: 1.6;
          -webkit-tap-highlight-color: transparent;
        }
        [contenteditable] {
          outline: none;
          min-height: calc(100vh - 32px);
          font-family: inherit;
        }
        [contenteditable]:empty:before {
          content: "Escribe tu nota aquí...";
          color: ${colors.textMuted};
          opacity: 0.6;
        }
        
        /* Lists, tables, indents styling matching premium aesthetics */
        ul, ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        li {
          margin: 4px 0;
        }
        
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        table, th, td {
          border: 1px solid ${colors.border};
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          font-size: 14px;
        }
        th {
          background-color: ${colors.accent};
          font-weight: bold;
        }

        blockquote {
          border-left: 4px solid ${colors.primary};
          background-color: ${colors.primarySoft};
          padding: 10px 16px;
          margin: 12px 0;
          border-radius: 8px;
          font-style: italic;
        }
        
        /* Inline styling classes */
        span {
          font-family: inherit;
        }
      </style>
    </head>
    <body>
      <div id="editor" contenteditable="${!isReadOnly}">${initialContent || ''}</div>
      <script>
        const editor = document.getElementById('editor');

        // Notify React Native when content changes
        if (${!isReadOnly}) {
          editor.addEventListener('input', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'onChange',
              html: editor.innerHTML
            }));
          });

          // Notify React Native of selection/focus change
          document.addEventListener('selectionchange', () => {
            const state = {
              bold: document.queryCommandState('bold'),
              italic: document.queryCommandState('italic'),
              underline: document.queryCommandState('underline')
            };
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'onSelectionChange',
              state
            }));
          });
        }

        // Listen for actions from React Native
        window.addEventListener('message', (event) => {
          try {
            const action = JSON.parse(event.data);
            if (action.type === 'exec') {
              document.execCommand(action.command, false, action.value || null);
            } else if (action.type === 'insertTable') {
              const tableHtml = \`
                <table>
                  <thead>
                    <tr><th>Columna 1</th><th>Columna 2</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Celda A1</td><td>Celda A2</td></tr>
                    <tr><td>Celda B1</td><td>Celda B2</td></tr>
                  </tbody>
                </table><p></p>
              \`;
              document.execCommand('insertHTML', false, tableHtml);
            } else if (action.type === 'setFont') {
              // Inject font family in selected text
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontFamily = action.value;
                span.appendChild(range.extractContents());
                range.insertNode(span);
              } else {
                editor.style.fontFamily = action.value;
              }
            } else if (action.type === 'setSize') {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.fontSize = action.value;
                span.appendChild(range.extractContents());
                range.insertNode(span);
              }
            } else if (action.type === 'setColor') {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.color = action.value;
                span.appendChild(range.extractContents());
                range.insertNode(span);
              }
            } else if (action.type === 'setIndent') {
              document.execCommand(action.value === 'indent' ? 'indent' : 'outdent');
            } else if (action.type === 'insertVerse') {
              const quoteHtml = \`<blockquote>\${action.value}</blockquote><p></p>\`;
              document.execCommand('insertHTML', false, quoteHtml);
            } else if (action.type === 'getHtml') {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'getHtmlResponse',
                html: editor.innerHTML
              }));
            } else if (action.type === 'updateContent') {
              editor.innerHTML = action.value;
            }
          } catch (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: e.message
            }));
          }
        });
      </script>
    </body>
    </html>
  `;
}
