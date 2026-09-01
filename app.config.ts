import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

const PUBLIC_REQUIRED_ENV = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_PRIVACY_URL',
  'EXPO_PUBLIC_SUPPORT_URL',
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL',
] as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = appJson.expo as ExpoConfig;
  const variant = process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT ?? 'internal';
  const isInternal = variant === 'internal';

  if (!isInternal) {
    const missing = PUBLIC_REQUIRED_ENV.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(
        `El build público requiere estas variables de EAS: ${missing.join(', ')}`,
      );
    }
  }

  return {
    ...config,
    ...base,
    name: isInternal ? 'BibliaAPP Interna' : 'BibliaAPP',
    description:
      'Aplicación cristiana sin fines de lucro para leer, estudiar y compartir las Escrituras.',
    scheme: isInternal ? 'bibliaapp-internal' : 'bibliaapp',
    ios: {
      ...base.ios,
      supportsTablet: false,
      bundleIdentifier: isInternal
        ? 'com.bibliaapp.mobile.internal'
        : 'com.bibliaapp.mobile',
      config: {
        ...base.ios?.config,
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        ...base.ios?.infoPlist,
        NSPhotoLibraryUsageDescription:
          'BibliaAPP usa las fotos que eliges para portadas, notas e imágenes de versículos.',
        NSPhotoLibraryAddUsageDescription:
          'BibliaAPP guarda en Fotos únicamente las imágenes de versículos que tú creas.',
        NSCameraUsageDescription:
          'BibliaAPP usa la cámara para escanear el código QR de un grupo.',
      },
    },
    android: {
      ...base.android,
      package: isInternal
        ? 'com.bibliaapp.mobile.internal'
        : 'com.bibliaapp.mobile',
      permissions: ['android.permission.CAMERA'],
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
      ],
    },
    extra: {
      ...base.extra,
      appVariant: variant,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? base.extra?.apiUrl,
    },
  };
};
