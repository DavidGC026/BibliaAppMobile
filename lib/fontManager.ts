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

export const POPULAR_FONTS: FontItem[] = [
  { id: 'Lora', name: 'Lora', category: 'Serif', url: 'https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_LOuGQbDFg.ttf' },
  { id: 'PlayfairDisplay', name: 'Playfair Display', category: 'Serif', url: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFI7DqDY3sN_kJ4b5UTT5r-N2WD-0IZPIFf.ttf' },
  { id: 'Merriweather', name: 'Merriweather', category: 'Serif', url: 'https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyOJr1yX8eGtGbS77Qced5W7w.ttf' },
  { id: 'Inter', name: 'Inter', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2D.ttf' },
  { id: 'Montserrat', name: 'Montserrat', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/montserrat/v29/JTUSjIg1_i6t8kCHKm41xM11.ttf' },
  { id: 'Roboto', name: 'Roboto', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.ttf' },
  { id: 'Outfit', name: 'Outfit', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/outfit/v11/Fons33G7M4Jw_2s.ttf' },
  { id: 'Poppins', name: 'Poppins', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/poppins/v22/pxiByp8kv8JHgFVrLDz7Z11l.ttf' },
  { id: 'Oswald', name: 'Oswald', category: 'Sans-serif', url: 'https://fonts.gstatic.com/s/oswald/v49/TK3iWgpwG0OpACHE1Of2F2A.ttf' },
  { id: 'FiraCode', name: 'Fira Code', category: 'Monospace', url: 'https://fonts.gstatic.com/s/firacode/v21/u8RE1_aR5cqpGPfQD7hdRfVv.ttf' },
  { id: 'JetBrainsMono', name: 'JetBrains Mono', category: 'Monospace', url: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tU3oV065tD3c19C_LzQ.ttf' }
];

export async function fetchGoogleFontUrl(fontName: string): Promise<string> {
  const formattedName = fontName.trim().replace(/\s+/g, '+');
  try {
    const response = await fetch(`https://fonts.googleapis.com/css?family=${formattedName}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error('No se pudo buscar la fuente en Google Fonts');
    const css = await response.text();
    const match = css.match(/src:\s*local\(.*?\),\s*url\((https:\/\/fonts\.gstatic\.com\/.*?\.ttf)\)/i) || 
                  css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/.*?\.ttf)\)/i);
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

    // 2. Download TTF file
    const downloadResult = await FileSystem.downloadAsync(font.url, localUri);
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
