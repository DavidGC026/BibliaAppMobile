import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Altura del teclado y borde superior en coordenadas de pantalla. */
export type KeyboardMetrics = {
  /** Alto del teclado virtual (0 si está cerrado). */
  height: number;
  /**
   * Y absoluta del borde superior del teclado, o `null` si está cerrado.
   *
   * Es el dato fiable para saber qué tapa el teclado: restar la altura al alto
   * de la ventana da otro número según se cuente o no la barra de navegación,
   * y con edge-to-edge esa cuenta no siempre sale.
   */
  topY: number | null;
};

/**
 * Métricas del teclado virtual. Expo SDK 56 va edge-to-edge: la ventana no se
 * redimensiona al abrirse el teclado, así que cada pantalla tiene que apartar
 * su contenido a mano.
 */
export function useKeyboardMetrics(): KeyboardMetrics {
  const [metrics, setMetrics] = useState<KeyboardMetrics>({ height: 0, topY: null });

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) =>
      setMetrics({ height: e.endCoordinates.height, topY: e.endCoordinates.screenY }),
    );
    const onHide = Keyboard.addListener(hideEvt, () => setMetrics({ height: 0, topY: null }));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return metrics;
}

/** Altura del teclado virtual (0 si está cerrado). */
export function useKeyboardHeight() {
  return useKeyboardMetrics().height;
}
