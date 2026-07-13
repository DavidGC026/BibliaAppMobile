import * as FileSystem from 'expo-file-system/legacy';
import * as Font from 'expo-font';
import * as SecureStore from 'expo-secure-store';

const FONTS_DIR = `${FileSystem.documentDirectory}fonts/`;
const FONTS_REGISTRY_KEY = 'DOWNLOADED_FONTS_REGISTRY';

export interface FontItem {
  id: string;
  name: string;
  category: string;
  url: string;
}

// Las URLs de fonts.gstatic.com caducan cuando Google rota la versión de la
// fuente; downloadFont resuelve siempre la URL vigente y estas quedan solo
// como respaldo si la API de Google Fonts no responde.
export const POPULAR_FONTS: FontItem[] = [
  { id: 'Lora', name: 'Lora', category: 'Serif', url: 'https://fonts.gstatic.com/s/lora/v37/0QI6MX1D_JOuGQbT0gvTJPa787weuxJBkqg.ttf' },
  { id: 'PlayfairDisplay', name: 'Playfair Display', category: 'Serif', url: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtY.ttf' },
  { id: 'Merriweather', name: 'Merriweather', category: 'Serif', url: 'https://fonts.gstatic.com/s/merriweather/v33/u-4D0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiScCmDxhtNOKl8yDr3icaFF3w.ttf' },
  { id: 'Inter', name: 'Inter', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf' },
  { id: 'Montserrat', name: 'Montserrat', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.ttf' },
  { id: 'Roboto', name: 'Roboto', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmUiA8.ttf' },
  { id: 'Outfit', name: 'Outfit', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1O4a0Fg.ttf' },
  { id: 'Poppins', name: 'Poppins', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJfedw.ttf' },
  { id: 'Oswald', name: 'Oswald', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYA.ttf' },
  { id: 'FiraCode', name: 'Fira Code', category: 'Monospace', url: 'https://fonts.gstatic.com/s/firacode/v27/uU9eCBsR6Z2vfE9aq3bL0fxyUs4tcw4W_D1sJVD7Mw.ttf' },
  { id: 'JetBrainsMono', name: 'JetBrains Mono', category: 'Monospace', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOQ.ttf' }
];

export interface GoogleFontResult {
  url: string;
  // Nombre canónico según Google Fonts (p. ej. "Playfair Display"),
  // independiente de cómo lo haya escrito el usuario.
  family: string;
}

async function tryFetchGoogleFontCss(familyQuery: string): Promise<GoogleFontResult | null> {
  // Sin User-Agent de navegador moderno la API sirve TTF (el formato que
  // acepta expo-font); con UA de Chrome devuelve woff/woff2.
  const response = await fetch(
    `https://fonts.googleapis.com/css?family=${familyQuery.replace(/\s+/g, '+')}`,
  );
  if (!response.ok) return null;
  const css = await response.text();
  const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+?\.(?:ttf|otf))\)/i);
  if (!urlMatch) return null;
  const familyMatch = css.match(/font-family:\s*'([^']+)'/);
  return {
    url: urlMatch[1],
    family: familyMatch ? familyMatch[1] : familyQuery,
  };
}

export async function fetchGoogleFont(fontName: string): Promise<GoogleFontResult> {
  const trimmed = fontName.trim();
  // La API css?family= es sensible a mayúsculas ("lobster" → 400, "Lobster"
  // → 200), así que se prueba tal cual y luego con cada palabra capitalizada.
  const titleCased = trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  const candidates = trimmed === titleCased ? [trimmed] : [trimmed, titleCased];
  try {
    for (const candidate of candidates) {
      const result = await tryFetchGoogleFontCss(candidate);
      if (result) return result;
    }
    throw new Error('No existe en Google Fonts o no ofrece archivo TTF. Revisa el nombre exacto (p. ej. "PT Sans").');
  } catch (error) {
    console.error('Error in fetchGoogleFont:', error);
    throw new Error(`Error al buscar la fuente "${trimmed}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ── Fuente elegida por nota ─────────────────────────────────────────
// El editor aplica la fuente de toda la nota como estilo del contenedor
// (no queda dentro del HTML guardado), así que se persiste aparte.
const noteFontKey = (noteId: number) => `NOTE_FONT_${noteId}`;

export async function getNoteFont(noteId: number): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(noteFontKey(noteId))) || 'Default';
  } catch {
    return 'Default';
  }
}

export async function saveNoteFont(noteId: number, fontId: string): Promise<void> {
  try {
    if (fontId === 'Default') {
      await SecureStore.deleteItemAsync(noteFontKey(noteId));
    } else {
      await SecureStore.setItemAsync(noteFontKey(noteId), fontId);
    }
  } catch (e) {
    console.error(`Error saving font preference for note ${noteId}:`, e);
  }
}

export async function deleteNoteFont(noteId: number): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(noteFontKey(noteId));
  } catch {
    // Limpieza de preferencia: ignorar si no existe
  }
}

export async function getDownloadedFonts(): Promise<FontItem[]> {
  try {
    const registryStr = await SecureStore.getItemAsync(FONTS_REGISTRY_KEY);
    return registryStr ? JSON.parse(registryStr) : [];
  } catch (e) {
    console.error('Error reading downloaded fonts registry:', e);
    return [];
  }
}

export async function isFontDownloaded(fontId: string): Promise<boolean> {
  const registry = await getDownloadedFonts();
  return registry.some((f) => f.id === fontId);
}

export async function downloadFont(font: FontItem): Promise<boolean> {
  try {
    // 1. Create fonts folder if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(FONTS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FONTS_DIR, { intermediates: true });
    }

    const localUri = `${FONTS_DIR}${font.id}.ttf`;

    // 2. Download TTF file — resolviendo primero la URL vigente, porque las
    // URLs de gstatic guardadas caducan cuando Google rota la versión
    let url = font.url;
    try {
      url = (await fetchGoogleFont(font.name)).url;
    } catch {
      // Sin acceso a la API o fuente no listada: probar la URL guardada
    }
    let downloadResult = await FileSystem.downloadAsync(url, localUri);
    if (downloadResult.status !== 200 && url !== font.url) {
      downloadResult = await FileSystem.downloadAsync(font.url, localUri);
    }
    if (downloadResult.status !== 200) {
      throw new Error(`Descarga fallida con código de estado ${downloadResult.status}`);
    }

    // 3. Register in SecureStore
    const registry = await getDownloadedFonts();
    if (!registry.some((f) => f.id === font.id)) {
      registry.push(font);
      await SecureStore.setItemAsync(FONTS_REGISTRY_KEY, JSON.stringify(registry));
    }

    // 4. Load in memory via expo-font
    await Font.loadAsync({
      [font.id]: localUri,
    });

    return true;
  } catch (error) {
    console.error(`Error downloading font ${font.name}:`, error);
    throw error;
  }
}

export async function deleteFont(fontId: string): Promise<boolean> {
  try {
    const localUri = `${FONTS_DIR}${fontId}.ttf`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localUri);
    }

    const registry = await getDownloadedFonts();
    const updated = registry.filter((f) => f.id !== fontId);
    await SecureStore.setItemAsync(FONTS_REGISTRY_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error(`Error deleting font ${fontId}:`, e);
    return false;
  }
}

export async function loadAllDownloadedFonts(): Promise<void> {
  try {
    const registry = await getDownloadedFonts();
    for (const font of registry) {
      const localUri = `${FONTS_DIR}${font.id}.ttf`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        try {
          await Font.loadAsync({
            [font.id]: localUri,
          });
        } catch (err) {
          console.error(`Failed to load font ${font.id} into expo-font:`, err);
        }
      }
    }
  } catch (e) {
    console.error('Error loading downloaded fonts:', e);
  }
}
