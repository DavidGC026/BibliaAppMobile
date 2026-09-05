# Android 4.1.3

Fecha: 2026-09-05. APK firmado y entregado con el nuevo diseño de interlineales
y comentarios.

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
La compilación se ejecutó con prioridad baja (`nice -n 10`).
La variante del bundle sigue siendo `internal`, con la misma API del APK anterior.
Los cambios locales previos de `feed.tsx` y `ExternalLink.tsx` permanecen incluidos
en la compilación y fuera de los commits de esta entrega.

## Verificación de entrega

`assembleRelease` terminó correctamente en **1 minuto y 3 segundos**: 817 tareas,
81 ejecutadas y 736 reutilizadas. Metro generó el bundle de 2074 módulos.

| Comprobación | Resultado |
| --- | --- |
| Versión del manifiesto y configuración Expo | `4.1.3`, código `52` |
| Paquete | `com.bibliaapp.mobile`, conservado |
| Firma | APK Signature Scheme v2 válida, mismo certificado que 4.1.2 |
| Modo depurable | Desactivado |
| Arquitecturas | `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` |
| Alineación ZIP | `zipalign -c -P 16 4` correcto |
| Configuración incorporada | `internal`, API `https://biblia2.dvguzman.com` |
| Bundle incorporado | SHA-256 idéntico al generado en esta compilación |
| Tamaño | 148 522 836 bytes, aproximadamente 148,5 MB |
| Propietario y permisos | `david:david`, modo `0644` |

SHA-256 del certificado:

```text
6baa7a10ad01290c88b4fd18c0aba558afad7ba2edc24fbf8da1b2703cbbf528
```

SHA-256 del APK entregado:

```text
59018b18a308fbb872c95fd099e863ec8b66fcc77e6a53aba96c75d57662968d
```

El APK se verificó en una carpeta temporal antes de copiarlo y renombrarlo al
destino. Se entregó el archivo `BibliaAPP-4.1.3-dvg-release.apk.sha256` junto a
él. La comprobación de la copia final respondió `OK`:

```bash
cd /home/david/biblia-release
sha256sum -c BibliaAPP-4.1.3-dvg-release.apk.sha256
```

El APK 4.1.2 permanece en el directorio. No se realizó una instalación en
dispositivo: el emulador figura `offline` en ADB. La alineación ZIP se verificó;
el comportamiento nativo y los dispositivos con páginas de memoria de 16 KB
requieren una prueba instalada.
