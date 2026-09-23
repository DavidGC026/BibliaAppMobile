# Cambios de seguridad — 4.4.2

- El controlador de sesión conserva credenciales ante desconexiones, timeouts, 403, 429 y errores del servidor. Revalida al volver a primer plano y guarda renovaciones antes de usarlas. Solo un 401 o un perfil explícitamente nulo confirma el cierre.
- Las descargas y las imágenes adjuntan el Bearer únicamente al origen exacto de la API y a sus rutas protegidas.
- El servidor debe tener activados los tokens GCM, la renovación y las sesiones persistentes revocables. La primera activación exige iniciar sesión otra vez.
- Tiptap 3.31.3 se incluye en el editor regenerado. Expo 56 y sus módulos nativos están alineados mediante `expo install --check`.
- Los overrides de Metro 0.84.5 y UUID 11.1.1 para Xcode corrigen avisos de dependencias; Xcode solo usa `uuid.v4()`. Revisarlos cuando Expo/React Native actualicen sus dependencias.
- Quedan tres avisos moderados heredados de `decode-uri-component` por Expo Router y `query-string`. La corrección publicada cambia a ESM y no se puede forzar sin adaptar y probar la interfaz CommonJS que consume Expo Router. No usar `npm audit fix --force`, que propone degradar el router a otra generación.
- `withReleaseSigning` y `check:native` impiden entregar una versión release con firma debug si falta la llave real. La llave permanece fuera del repositorio.

Validación: suite `npm run check`, TypeScript, `expo install --check`, exportación iOS y compilación Android. Verificar certificado y versión con `apksigner`/`aapt` antes de distribuir. La entrega ARM64 mantiene el paquete Android instalado `com.bibliaapp.mobile`, versión 4.4.2, código 58; el proyecto nativo existente conserva ambos esquemas OAuth.

El APK se construye desde el checkout completo, que contiene además cambios anteriores de descargas en segundo plano. Los commits de seguridad no incorporan esos cambios ajenos.
