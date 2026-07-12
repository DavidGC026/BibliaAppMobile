import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Genera un PDF de la nota (conserva el formato HTML del editor) y abre la
 * hoja de compartir del sistema. En web abre el dialogo de impresion.
 */
export async function exportNoteAsPdf(options: { title: string; contentHtml: string }): Promise<void> {
  const title = options.title.trim() || 'Nota';
  const date = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 48px; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1F2937;
    line-height: 1.65;
    font-size: 14px;
  }
  h1.__note-title {
    font-size: 24px;
    line-height: 1.3;
    margin: 0 0 4px;
    color: #111827;
  }
  p.__note-meta {
    margin: 0 0 24px;
    font-size: 11px;
    color: #6B7280;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 12px;
  }
  img { max-width: 100%; }
  blockquote {
    margin: 12px 0;
    padding: 8px 16px;
    border-left: 3px solid #92700C;
    color: #4B5563;
  }
  footer.__note-footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #E5E7EB;
    font-size: 10px;
    color: #9CA3AF;
  }
</style>
</head>
<body>
  <h1 class="__note-title">${escapeHtml(title)}</h1>
  <p class="__note-meta">${escapeHtml(date)}</p>
  ${options.contentHtml}
  <footer class="__note-footer">Exportado desde BibliaAPP</footer>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
  }
}
