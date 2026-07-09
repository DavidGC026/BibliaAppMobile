import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/** Espacio inferior para listas/scroll: barra del sistema + teclado + margen. */
export function useContentPadding(extra: number = spacing.lg) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  return extra + insets.bottom + keyboardHeight;
}
