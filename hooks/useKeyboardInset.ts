import { useState } from 'react';
import {
  KeyboardState,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedReaction,
} from 'react-native-reanimated';

/**
 * Cuánto tapa el teclado por abajo, medido por el sistema.
 *
 * Por qué no vale `Keyboard.addListener('keyboardDidShow')`, que es lo que usa
 * [`useKeyboardHeight`](./useKeyboardHeight.ts): en Android ese alto sale de
 * `getWindowVisibleDisplayFrame`, una estimación que en edge-to-edge no siempre
 * cuadra con el teclado de verdad y que solo se reemite cuando al sistema le
 * parece. Un teclado que cambia de alto sin «abrirse» —al aparecer la fila de
 * herramientas de Gboard o Samsung, por ejemplo— deja el valor viejo. Con unos
 * pocos puntos de error basta para que una barra pegada al fondo quede a medias
 * debajo del teclado.
 *
 * Esto lee el inset IME (`WindowInsetsCompat.Type.ime()`), que es el dato del
 * que el propio sistema se sirve para colocar el teclado, y se entera de
 * cualquier cambio de tamaño.
 *
 * `isNavigationBarTranslucentAndroid` va en `true` a propósito: la app es
 * edge-to-edge y se dibuja por detrás de la barra de navegación, así que hace
 * falta el inset completo desde el borde de la ventana. En `false` Reanimated
 * le restaría la barra de navegación y volveríamos a quedarnos cortos.
 */
export function useKeyboardInset(): number {
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const [inset, setInset] = useState(0);

  useAnimatedReaction(
    () => ({ height: Math.round(keyboard.height.value), state: keyboard.state.value }),
    (current, previous) => {
      // Solo valores asentados. Seguir la animación fotograma a fotograma
      // redimensionaría el WebView en cada uno, y rehacer la maqueta de una nota
      // larga sesenta veces por segundo se nota.
      if (current.state !== KeyboardState.OPEN && current.state !== KeyboardState.CLOSED) return;
      if (previous !== null && current.height === previous.height) return;
      runOnJS(setInset)(current.height);
    },
  );

  return inset;
}
