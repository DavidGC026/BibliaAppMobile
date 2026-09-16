import * as WebBrowser from 'expo-web-browser';

import { API_BASE_URL, APP_VARIANT } from './config';

WebBrowser.maybeCompleteAuthSession();

const MOBILE_REDIRECT = `${APP_VARIANT === 'internal' ? 'bibliaapp-internal' : 'bibliaapp'}://auth/google`;

export async function signInWithGoogle(): Promise<string> {
  const result = await WebBrowser.openAuthSessionAsync(
    `${API_BASE_URL}/api/auth/google?mobile=1&variant=${encodeURIComponent(APP_VARIANT)}`,
    MOBILE_REDIRECT,
  );

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Inicio de sesión con Google cancelado.');
  }

  if (result.type !== 'success') {
    throw new Error('No se pudo completar el inicio de sesión con Google.');
  }

  const url = new URL(result.url);
  const error = url.searchParams.get('error');
  if (error) {
    throw new Error(error);
  }

  const token = url.searchParams.get('token');
  if (!token) {
    throw new Error('No se recibió el token de sesión.');
  }

  return token;
}
