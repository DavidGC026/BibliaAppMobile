import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

/**
 * Espacio inferior para listas/scroll: lo que tape el sistema por abajo, más un
 * margen.
 *
 * El teclado y la barra de navegación no se suman: el inset IME se mide desde el
 * borde de la ventana, así que cuando hay teclado ya incluye la banda de la
 * barra. Sumarlos la contaría dos veces y dejaría las listas cortas por arriba.
 */
export function useContentPadding(extra: number = spacing.lg) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  return extra + Math.max(insets.bottom, keyboardInset);
}
