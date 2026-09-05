# Android 4.1.2

Fecha: 2026-09-05. APK generado, firmado y entregado con las
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
GRADLE_USER_HOME="$PWD/android/.gradle/release-home" \
DVGUZMAN_KEYSTORE_PROPERTIES=/home/david/.dvguzman/keystore.properties \
RELEASE_DIR=/home/david/biblia-release \
RELEASE_SUFFIX=dvg \
npm run build:android:release
```

El script ejecuta `check:native`, compila `assembleRelease` y copia el APK al
destino. Las contraseñas y el almacén de firma permanecen fuera del repositorio.

El primer intento encontró bloqueada `/root/.gradle/caches/journal-1` por otra
instancia de Gradle. Se utiliza una caché de trabajo independiente bajo
`android/.gradle/release-home`, con dos workers y vigilancia de archivos desactivada. Los
metadatos de dependencias tienen su propia copia; los artefactos descargados,
identificados por su contenido, se reutilizan mediante enlaces físicos. No se
comparten los archivos de bloqueo con la compilación que causó el conflicto.

La compilación se detuvo a petición del usuario para reiniciar el servidor,
antes de generar el APK. Tras el reinicio se trasladó la caché desde
`.build-tmp/`: las fuentes del bundle de React Native excluyen `android/`, y Expo
excluye `android/.gradle` del mapa de archivos de Metro. Esta ubicación evita
recorrer la caché al buscar código JavaScript. Se conservan las dependencias
descargadas y los resultados nativos del intento anterior.

## Verificación

La compilación terminó con `BUILD SUCCESSFUL in 18m`: 817 tareas, 140 ejecutadas
y 677 reutilizadas. El bundle Android contiene 2069 módulos. Antes de copiar el
APK al destino se comprobaron su firma, manifiesto, configuración incorporada,
arquitecturas y alineación.

| Comprobación | Resultado |
| --- | --- |
| Versión del manifiesto y configuración Expo | `4.1.2`, código `51` |
| Paquete Android | `com.bibliaapp.mobile`, igual al APK 4.1.1 |
| Firma | Válida con APK Signature Scheme v2; certificado idéntico al de 4.1.1 |
| Modo depurable | Desactivado |
| Arquitecturas | `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` |
| Alineación ZIP | `zipalign -c -P 16 4` correcto |
| Configuración incorporada | Variante `internal`, API `https://biblia2.dvguzman.com` |
| Bundle incorporado | SHA-256 idéntico al bundle generado por esta compilación |
| Tamaño del APK | 148 505 080 bytes, aproximadamente 148,5 MB |
| Propietario y permisos de entrega | `david`, modo `0644` |

SHA-256 del certificado de firma:

```text
6baa7a10ad01290c88b4fd18c0aba558afad7ba2edc24fbf8da1b2703cbbf528
```

SHA-256 del APK entregado:

```text
127ee9a7cd7997183f031c1fafde2763a983943ef9cc354e205a491237b180eb
```

La entrega se realizó mediante una copia temporal y un renombrado al nombre
final. Se dejó también `BibliaAPP-4.1.2-dvg-release.apk.sha256` junto al APK y
se comprobó la integridad del archivo ya entregado:

```bash
cd /home/david/biblia-release
sha256sum -c BibliaAPP-4.1.2-dvg-release.apk.sha256
# BibliaAPP-4.1.2-dvg-release.apk: OK
```

No se instaló este APK en un dispositivo durante esta entrega. La firma, el
paquete conservado y el código de versión superior permiten su actualización,
pero queda comprobar la instalación y el funcionamiento nativo. La comprobación
de alineación ZIP tampoco sustituye una prueba en un dispositivo con páginas de
memoria de 16 KB.
