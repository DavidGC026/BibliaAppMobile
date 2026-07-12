import * as SecureStore from 'expo-secure-store';

const TEMPLATE_KEY = 'BIBLIA_VERSE_IMAGE_TEMPLATE';

/** Estilo favorito del creador de imagenes; el tamano de letra no se guarda porque depende del largo del versiculo. */
export type VerseImageTemplate = {
  formatId: string;
  styleId: string;
  gradientId: string;
};

export async function getVerseImageTemplate(): Promise<VerseImageTemplate | null> {
  try {
    const raw = await SecureStore.getItemAsync(TEMPLATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VerseImageTemplate>;
    if (typeof parsed.formatId !== 'string' || typeof parsed.styleId !== 'string' || typeof parsed.gradientId !== 'string') {
      return null;
    }
    return { formatId: parsed.formatId, styleId: parsed.styleId, gradientId: parsed.gradientId };
  } catch {
    return null;
  }
}

export async function saveVerseImageTemplate(template: VerseImageTemplate) {
  await SecureStore.setItemAsync(TEMPLATE_KEY, JSON.stringify(template));
}
