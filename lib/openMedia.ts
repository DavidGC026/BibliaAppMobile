import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { API_BASE_URL } from './config';

type TokenGetter = () => string | null;
let getToken: TokenGetter = () => null;

export function setOpenMediaTokenGetter(getter: TokenGetter) {
  getToken = getter;
}

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

/** Limpia el nombre: quita emojis/espacios problemáticos para el sistema de archivos. */
function sanitizeName(name: string): string {
  return name
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function hasExtension(name: string): boolean {
  return /\.[a-z0-9]{2,5}$/i.test(name);
}

/** Descarga archivo protegido y lo abre/comparte (PDF, etc.) con extensión correcta. */
export async function openAuthedFile(relativeOrAbsoluteUrl: string, label?: string): Promise<void> {
  const url = relativeOrAbsoluteUrl.startsWith('http')
    ? relativeOrAbsoluteUrl
    : `${API_BASE_URL}${relativeOrAbsoluteUrl.startsWith('/') ? '' : '/'}${relativeOrAbsoluteUrl}`;

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // Nombre base limpio a partir de la etiqueta o la URL.
  let base = sanitizeName(label ?? '') || sanitizeName(url.split('/').pop() ?? '') || 'archivo';

  const result = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}${base}`, { headers });

  if (result.status !== 200) {
    throw new Error(`No se pudo descargar el archivo (${result.status})`);
  }

  // El endpoint /api/media/{id} no trae extensión en la URL: la derivamos del
  // Content-Type real para que el archivo no se abra como "corrupto".
  let finalUri = result.uri;
  if (!hasExtension(base)) {
    const contentType = (
      result.headers['Content-Type'] ||
      result.headers['content-type'] ||
      ''
    )
      .split(';')[0]
      .trim()
      .toLowerCase();
    const ext = MIME_EXT[contentType];
    if (ext) {
      const withExt = `${FileSystem.cacheDirectory}${base}.${ext}`;
      try {
        await FileSystem.moveAsync({ from: result.uri, to: withExt });
        finalUri = withExt;
      } catch {
        finalUri = result.uri;
      }
    }
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('No hay app para abrir el archivo en este dispositivo.');
  }

  const shareMime = (result.headers['Content-Type'] || result.headers['content-type'] || '')
    .split(';')[0]
    .trim();
  await Sharing.shareAsync(finalUri, shareMime ? { mimeType: shareMime } : undefined);
}
