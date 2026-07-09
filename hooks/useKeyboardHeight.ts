import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Altura del teclado virtual (0 si está cerrado). Expo SDK 56 edge-to-edge no redimensiona la ventana. */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
}
