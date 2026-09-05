# Android 4.1.2

Fecha: 2026-09-05. Preparación del APK solicitado con las
[integraciones de estudio](integraciones-estudio.md).

## Versión e identidad

- Versión anterior comprobada en el APK: **4.1.1**, código **50**.
- Nueva versión: **4.1.2**, código **51** en `app.json` y en Gradle.
- Paquete Android: `com.bibliaapp.mobile`, conservado del APK anterior.
- Firma: alias `dvguzman`, configurado mediante
  `/home/david/.dvguzman/keystore.properties`.
- Destino solicitado: `/home/david/biblia-release/BibliaAPP-4.1.2-dvg-release.apk`.
  Esta carpeta en minúsculas es distinta del archivo histórico
  `/home/david/Biblia-release`.

Se conserva la configuración nativa existente. El script local genera el bundle
con la variante `internal`, como los APK anteriores; `check:native` advierte de
la diferencia con el identificador que generaría un nuevo prebuild. No se
regenera `android/`: cambiar su identidad impediría actualizar la instalación
actual. La carpeta nativa está ignorada por Git; al reproducir la compilación,
hay que comprobar el paquete, la versión y el código con `check:native`.

Se mantiene la retirada previa de `expo-speech` de la lista `plugins`:
la dependencia instalada no incluye un config plugin. La dependencia de voz
continúa instalada y se enlaza automáticamente. Los cambios locales previos de
`app/(tabs)/feed.tsx` y `components/ExternalLink.tsx` se conservan en la compilación
y quedan fuera de los commits de esta entrega.

## Compilación

Desde la carpeta `mobile`, con Java 21 y el SDK local:

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
GRADLE_USER_HOME="$PWD/.build-tmp/gradle-release-4.1.2" \
DVGUZMAN_KEYSTORE_PROPERTIES=/home/david/.dvguzman/keystore.properties \
RELEASE_DIR=/home/david/biblia-release \
RELEASE_SUFFIX=dvg \
npm run build:android:release
```

El script ejecuta `check:native`, compila `assembleRelease` y copia el APK al
destino. Las contraseñas y el almacén de firma permanecen fuera del repositorio.

El primer intento encontró bloqueada `/root/.gradle/caches/journal-1` por otra
instancia de Gradle. Se prepara una caché de trabajo independiente bajo
`.build-tmp/`, con dos workers y vigilancia de archivos desactivada. Los
metadatos de dependencias tienen su propia copia; los artefactos descargados,
identificados por su contenido, se reutilizan mediante enlaces físicos. No se
comparten los archivos de bloqueo con la compilación que causó el conflicto.

## Verificación

Pendiente de completar al terminar la compilación: firma, versión del manifiesto,
arquitecturas incluidas, alineación y SHA-256 del archivo entregado.
