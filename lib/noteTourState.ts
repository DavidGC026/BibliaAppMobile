import * as SecureStore from 'expo-secure-store';

const KEY = 'BIBLIA_NOTE_TOUR_SEEN';

/**
 * Versión de los pasos del tutorial de notas.
 *
 * Subirla vuelve a ofrecerlo una vez a quien ya lo había visto, que es lo que
 * hace falta cuando el editor gana algo que no estaba explicado.
 */
const TOUR_VERSION = '1';

/** Si ya se vio el tutorial de esta versión. Ante la duda, no molestar. */
export async function isNoteTourSeen(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === TOUR_VERSION;
  } catch {
    return true;
  }
}

export async function markNoteTourSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, TOUR_VERSION);
  } catch {
    // Sin almacén seguro el tutorial se volverá a ofrecer: molesta menos que fallar.
  }
}
