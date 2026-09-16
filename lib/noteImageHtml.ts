/**
 * Utilidades puras sobre las imágenes del HTML de una nota.
 *
 * Sin dependencias de Expo, red ni SQLite: se pueden probar en Node
 * (`node scripts/test_note_images.cjs`) y reutilizar desde cualquier capa.
 * La subida y la caché viven en `lib/noteImageSync.ts`.
 */

export interface DataUriImage {
  dataUri: string;
  mime: string;
  base64: string;
}

const IMG_TAG = /<img\b[^>]*>/gi;
const SRC_ATTR = /(\bsrc\s*=\s*)("([^"]*)"|'([^']*)')/i;
const DATA_URI = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i;

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/** Atajo baratísimo para no recorrer notas que no traen imágenes incrustadas. */
export function hasEmbeddedImages(html: string): boolean {
  return typeof html === 'string' && html.includes('data:image/');
}

/**
 * Reescribe el `src` de cada `<img>` del HTML.
 * `map` recibe el `src` actual y devuelve el nuevo, o `null` para dejarlo igual.
 */
export function mapNoteImageSources(html: string, map: (src: string) => string | null): string {
  if (typeof html !== 'string' || !html) return html;
  return html.replace(IMG_TAG, (tag) => {
    const match = SRC_ATTR.exec(tag);
    if (!match) return tag;
    const quote = match[2].charAt(0);
    const src = match[3] ?? match[4] ?? '';
    const next = map(src);
    if (next == null || next === src) return tag;
    // `$` en el reemplazo se escapa: una URL con $1 no debe expandirse.
    return tag.replace(SRC_ATTR, `$1${quote}${next.replace(/\$/g, '$$$$')}${quote}`);
  });
}

/** `data:` URIs de imagen que aparecen en el HTML, sin repetir y en orden. */
export function collectDataUriImages(html: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  mapNoteImageSources(html, (src) => {
    if (DATA_URI.test(src) && !seen.has(src)) {
      seen.add(src);
      found.push(src);
    }
    return null;
  });
  return found;
}

export function parseDataUri(dataUri: string): DataUriImage | null {
  const match = DATA_URI.exec(String(dataUri).trim());
  if (!match) return null;
  const base64 = match[2].replace(/\s+/g, '');
  if (!base64) return null;
  return { dataUri, mime: match[1].toLowerCase(), base64 };
}

export function extensionForMime(mime: string): string {
  return MIME_EXTENSIONS[String(mime).toLowerCase()] ?? 'jpg';
}

/**
 * Identifica los bytes de una imagen para no volver a subirla.
 *
 * FNV-1a sobre el propio `data:` URI más su longitud. No es criptográfico: solo
 * es la clave de una caché local, y el editor puede pedir la misma imagen
 * varias veces (cada autoguardado reenvía el HTML con el base64 todavía en el
 * DOM), así que lo que hace falta es que la operación sea idempotente.
 */
export function hashDataUri(dataUri: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dataUri.length; i++) {
    hash ^= dataUri.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${dataUri.length.toString(36)}`;
}
