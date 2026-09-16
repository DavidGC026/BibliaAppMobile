import * as FileSystem from 'expo-file-system/legacy';

import * as api from '@/lib/api';
import { getFirst, nowIso, run } from '@/lib/db';
import { getIsOnline } from '@/lib/network';
import {
  collectDataUriImages,
  extensionForMime,
  hasEmbeddedImages,
  hashDataUri,
  mapNoteImageSources,
  parseDataUri,
} from '@/lib/noteImageHtml';

/**
 * Saca de las notas las imágenes incrustadas en base64.
 *
 * Cuando se inserta una imagen sin conexión, `app/note/[noteId].tsx` la mete en
 * el HTML como `data:image/...;base64,…` (es lo único que el WebView puede
 * pintar sin red). Eso funciona, pero ese HTML es el contenido de la nota: se
 * guardaba tal cual en SQLite **y en MySQL**, así que una nota con tres fotos
 * son varios MB en la base de datos y en cada sincronización.
 *
 * Aquí se sube cada imagen y se sustituye el base64 por su URL pública. La
 * caché por hash (`note_image_uploads`) hace la operación idempotente: el DOM
 * del editor sigue teniendo el base64 mientras la nota está abierta, así que el
 * mismo contenido pasa por aquí en cada autoguardado y no debe subirse dos
 * veces.
 *
 * Sin conexión o sin sesión no se toca nada: la nota queda `dirty` con su base64
 * y `lib/sync.ts` lo reintenta al volver la red.
 */
export async function uploadEmbeddedNoteImages(html: string): Promise<string> {
  if (!hasEmbeddedImages(html)) return html;
  if (!getIsOnline() || !api.getApiToken()) return html;

  const resolved = new Map<string, string>();
  for (const dataUri of collectDataUriImages(html)) {
    const url = await resolveUploadedUrl(dataUri);
    if (url) resolved.set(dataUri, url);
  }
  if (resolved.size === 0) return html;

  return mapNoteImageSources(html, (src) => resolved.get(src) ?? null);
}

/** URL pública de la imagen, subiéndola solo si no se había subido ya. */
async function resolveUploadedUrl(dataUri: string): Promise<string | null> {
  const hash = hashDataUri(dataUri);

  const cached = await getFirst<{ url: string }>(
    'SELECT url FROM note_image_uploads WHERE hash = ?',
    [hash],
  );
  if (cached?.url) return cached.url;

  const parsed = parseDataUri(dataUri);
  if (!parsed) return null;

  const fileName = `note-image-${hash}.${extensionForMime(parsed.mime)}`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  try {
    // `api.uploadImage` sube desde un archivo local, así que el base64 se
    // materializa en caché y se borra en cuanto termina.
    await FileSystem.writeAsStringAsync(fileUri, parsed.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const res = await api.uploadImage(fileUri, fileName, parsed.mime);
    const url = res.filename ? api.getPublicUploadUrl(res.filename) : (res.url ?? '');
    if (!url) return null;
    await run(
      'INSERT OR REPLACE INTO note_image_uploads (hash, url, created_at) VALUES (?, ?, ?)',
      [hash, url, nowIso()],
    );
    return url;
  } catch {
    // Se reintenta en el próximo guardado o sincronización.
    return null;
  } finally {
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {
      // Archivo temporal: si no se puede borrar, no es un error de la nota.
    }
  }
}
