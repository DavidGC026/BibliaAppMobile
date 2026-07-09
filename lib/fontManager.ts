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

export async function fetchGoogleFontUrl(fontName: string): Promise<string> {
  const formattedName = fontName.trim().replace(/\s+/g, '+');
  try {
    // Sin User-Agent de navegador moderno la API sirve TTF (el formato que
    // acepta expo-font); con UA de Chrome devuelve woff/woff2.
    const response = await fetch(`https://fonts.googleapis.com/css?family=${formattedName}`);
    if (!response.ok) throw new Error('No se pudo buscar la fuente en Google Fonts');
    const css = await response.text();
    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+?\.(?:ttf|otf))\)/i);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error('No se encontró el archivo de la fuente (TTF)');
  } catch (error) {
    console.error('Error in fetchGoogleFontUrl:', error);
    throw new Error(`Error al buscar la fuente "${fontName}": ${error instanceof Error ? error.message : String(error)}`);
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
      url = await fetchGoogleFontUrl(font.name);
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
