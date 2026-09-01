import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { runOnJS, useAnimatedKeyboard, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import { insetToPublish } from './keyboardInsetState';

/**
 * Cuánto tapa el teclado por abajo, medido por el sistema.
 *
 * Es **la única fuente** del alto del teclado en la app. Lo que se usaba antes
 * —`Keyboard.addListener('keyboardDidShow')`— sale en Android de
 * `getWindowVisibleDisplayFrame`, una estimación que con edge-to-edge no siempre
 * cuadra y que solo se reemite cuando al sistema le parece: un teclado que
 * cambia de alto sin «abrirse» (aparece la fila de herramientas de Gboard o de
 * Samsung, se cambia a emojis) deja el valor viejo. Con unos pocos puntos de
 * error basta para que una barra pegada al fondo quede a medias debajo.
 *
 * Esto lee el inset IME (`WindowInsetsCompat.Type.ime()`), que es el dato del
 * que el propio sistema se sirve para colocar el teclado, y se entera de
 * cualquier cambio de tamaño.
 *
 * **Cómo se usa el valor:** es la distancia desde el borde inferior de la
 * ventana, así que ya incluye la banda de la barra de navegación. Va con
 * `Math.max(insets.bottom, teclado)`, nunca sumado a `insets.bottom`, o esa
 * banda se cuenta dos veces.
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
  /** Último alto que se le pasó a React; ver `insetToPublish`. */
  const published = useSharedValue(0);

  useAnimatedReaction(
    () => ({ height: Math.round(keyboard.height.value), state: keyboard.state.value }),
    (frame) => {
      const next = insetToPublish(frame, published.value);
      if (next === null) return;
      published.value = next;
      runOnJS(setInset)(next);
    },
  );

  // Red de seguridad: si el teclado se va sin animación de insets —volviendo de
  // segundo plano, o según qué capa del fabricante— no llega ningún `CLOSED` y
  // nada más volvería a moverlo. Solo baja a cero, que es el estado seguro: si
  // el teclado sigue ahí, el siguiente inset lo vuelve a subir.
  useEffect(() => {
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      published.value = 0;
      setInset(0);
    });
    return () => hidden.remove();
  }, [published]);

  return inset;
}
