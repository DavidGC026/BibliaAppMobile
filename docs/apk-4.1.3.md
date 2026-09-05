# Android 4.1.3

Fecha: 2026-09-05. Actualización del diseño de interlineales y comentarios.

## Cambios incluidos

- Interlineal por versículo, palabras en orden, ayuda y ficha Strong con detalles
  lingüísticos desplegables.
- Comentarios con autor, vista previa, alcance y lectura dedicada del artículo.
- Accesos explicados desde el lector, contraste corregido, texto ampliable y
  navegación que conserva la posición y los filtros.

La [bitácora de estudio](integraciones-estudio.md) incluye decisiones, pruebas y
capturas del nuevo diseño. TypeScript, `check:study` y 21 comprobaciones de la
interfaz en React Native Web resultaron correctos antes de preparar el release.

## Versión, firma y entrega

- Anterior: `4.1.2`, código `51`. Nueva: **`4.1.3`, código `52`**.
- Se conserva el paquete nativo `com.bibliaapp.mobile` y el certificado `dvguzman`.
- Configuración de firma privada: `/home/david/.dvguzman/keystore.properties`.
- Destino: `/home/david/biblia-release/BibliaAPP-4.1.3-dvg-release.apk`.
- Se conserva el APK 4.1.2 junto con su checksum.

Se usa el [procedimiento de compilación anterior](apk-4.1.2.md#compilación), con
Java 21, Gradle 8.14.3 y caché independiente en `android/.gradle/release-home`.
La configuración mantiene dos workers y no se regenera el proyecto Android.
La variante del bundle sigue siendo `internal`, con la misma API del APK anterior.
Los cambios locales previos de `feed.tsx` y `ExternalLink.tsx` permanecen incluidos
en la compilación y fuera de los commits de esta entrega.

## Verificación de entrega

Pendiente del resultado de `assembleRelease` y la comprobación del APK firmado.
No hay un dispositivo disponible para una prueba instalada: el emulador figura
`offline` en ADB.
