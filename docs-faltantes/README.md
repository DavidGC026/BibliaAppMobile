# Pendientes para publicar BibliaAPP Mobile

Estado revisado el 15 de julio de 2026.

La aplicación está técnicamente configurada para generar builds con Expo EAS, pero todavía no conviene enviarla a revisión pública en Google Play o App Store. Antes deben resolverse los requisitos de privacidad, cuentas, contenido comunitario, permisos y presentación descritos aquí.

## Documentos complementarios

- [Estrategia legal y técnica para las Biblias](./01-estrategia-biblias-y-rvr1960.md)
- [Cuatro traducciones candidatas para el lanzamiento](./02-traducciones-candidatas.md)
- [Implementación pendiente de Open Nueva Biblia Viva](./03-onbv-implementacion-pendiente.md)
- [Implementación pendiente de Reina-Valera 1909](./04-rvr1909-implementacion-pendiente.md)
- [Variantes pública e interna, roles y permisos bíblicos](./05-variantes-roles-y-tiendas.md)
- [Implementación de variantes y licencias](./06-implementacion-variantes-y-licencias.md)
- [Plan de integración compatible con API.Bible](./07-integracion-api-bible.md)

## Estado técnico actual

- Proyecto Expo: `@deividjd26/bibliaapp`.
- Expo SDK: 56.
- Versión de la aplicación: `3.3`.
- Android package: `com.bibliaapp.mobile`.
- Android version code inicial en EAS: `37`.
- iOS bundle identifier: `com.bibliaapp.mobile`.
- Expo Doctor: 21 de 21 comprobaciones aprobadas después de actualizar los parches compatibles con SDK 56.
- Existen perfiles EAS `development`, `preview` e `internal` para el equipo, y `production` para tiendas.
- La configuración dinámica genera `com.bibliaapp.mobile.internal` para el equipo y `com.bibliaapp.mobile` para tiendas.
- El catálogo del API ya admite licencias, capacidades y permisos individuales por usuario.
- El widget existente es exclusivo de Android; no impide compilar la aplicación principal para iOS.

## Pendientes obligatorios o de alto riesgo

### 1. Política de privacidad

Crear una política de privacidad publicada en una URL HTTPS pública, accesible y no bloqueada por ubicación. También debe existir un enlace fácilmente accesible dentro de la aplicación, por ejemplo en Perfil o Acerca de.

La política debe explicar, como mínimo:

- Qué datos de cuenta se recopilan: nombre, correo, nombre de usuario y rol.
- Qué datos se sincronizan con el servidor: notas, favoritos, subrayados, actividad, publicaciones y archivos.
- Uso de imágenes elegidas por el usuario.
- Uso de tokens de notificaciones push.
- Almacenamiento local mediante SQLite y SecureStore.
- Proveedores o terceros que reciben datos.
- Medidas generales de seguridad.
- Plazos o criterios de retención.
- Procedimiento de eliminación de cuenta y datos.
- Medio de contacto para privacidad.

Referencias oficiales:

- [Privacidad en App Store Connect](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Política de datos de usuario de Google Play](https://support.google.com/googleplay/android-developer/answer/17105854)

### 2. Eliminación de cuenta

La plataforma web permite crear cuentas, pero la aplicación móvil no ofrece actualmente una opción visible para eliminar la cuenta.

Implementar:

- Opción `Eliminar cuenta` dentro de Perfil.
- Confirmación clara de que la acción elimina la cuenta y los datos asociados.
- Endpoint de backend disponible para el propio usuario autenticado.
- Eliminación o anonimización de publicaciones, notas y demás datos según la política definida.
- Página web pública para solicitar o iniciar la eliminación.
- Revocación de sesiones, tokens y notificaciones push al finalizar.

Apple exige que una app que permite crear cuentas permita iniciar su eliminación desde la propia app. Google Play también solicita el flujo dentro de la app y una URL web de eliminación.

Referencias oficiales:

- [Eliminación de cuentas en Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Eliminación de cuentas en Google Play](https://support.google.com/googleplay/android-developer/answer/13327111)

### 3. Moderación de la comunidad

El feed móvil permite que los usuarios publiquen contenido. Antes de enviar la app a revisión deben existir controles de moderación efectivos.

Implementar:

- Filtro para impedir o reducir contenido objetable.
- Acción para denunciar una publicación.
- Acción para denunciar a un usuario.
- Acción para bloquear y desbloquear usuarios.
- Ocultamiento inmediato del contenido o usuario bloqueado.
- Flujo administrativo para revisar reportes y responder oportunamente.
- Reglas de comunidad publicadas.
- Información de contacto visible para reportar abusos.
- Registro de las decisiones de moderación.

Apple enumera expresamente el filtrado, reporte, bloqueo y contacto como requisitos para aplicaciones con contenido generado por usuarios.

Referencia oficial:

- [App Review Guidelines, sección 1.2](https://developer.apple.com/app-store/review/guidelines/)

### 4. Inicio de sesión en iOS

La aplicación ofrece inicio de sesión mediante Google. En iOS esto puede requerir otra opción equivalente que permita al usuario ocultar su correo.

Elegir una de estas estrategias:

1. Implementar `Sign in with Apple` en móvil y backend.
2. Ocultar `Continuar con Google` en iOS y conservar únicamente el sistema propio de correo y contraseña, validando que la experiencia entre dentro de las excepciones de Apple.

La primera alternativa ofrece una experiencia más completa. La segunda puede reducir trabajo inicial, pero debe evaluarse cuidadosamente antes de revisión.

Referencia oficial:

- [App Review Guidelines, sección 4.8](https://developer.apple.com/app-store/review/guidelines/)

### 5. Permisos Android de fotos y almacenamiento

La configuración Android declara permisos amplios de imágenes, video, audio y almacenamiento. La funcionalidad observada utiliza selección ocasional de imágenes y guardado de imágenes creadas, por lo que probablemente no justifica acceso amplio a toda la biblioteca.

Antes de producción:

- Usar el selector de fotos del sistema para elecciones puntuales.
- Eliminar `READ_MEDIA_VIDEO` y `READ_MEDIA_AUDIO` si no son imprescindibles.
- Evitar `READ_MEDIA_IMAGES` si el selector del sistema cubre el caso de uso.
- Retirar permisos antiguos de lectura y escritura de almacenamiento cuando no sean necesarios.
- Generar el manifest final y verificar que ningún plugin reincorpore permisos amplios.
- Completar la declaración de permisos y Data Safety de acuerdo con el binario real.

Referencia oficial:

- [Política de permisos de fotos y videos de Google Play](https://support.google.com/googleplay/android-developer/answer/15800983)

### 6. Derechos del contenido

Documentar y conservar evidencia de los derechos para distribuir:

- Traducciones bíblicas y textos relacionados.
- Diccionarios y material de estudio.
- Imágenes de fondos y portadas.
- Tipografías descargables o incluidas.
- Iconos, logotipos y demás recursos gráficos.
- Contenido publicado por administradores o congregaciones.

Las fichas de tienda y las notas de revisión no deben atribuir a BibliaAPP derechos o afiliaciones que no puedan demostrarse.

## Documentación legal recomendada

Además de la política de privacidad, preparar:

- Términos y condiciones de uso.
- Reglas o estándares de la comunidad.
- Política de contenido y moderación.
- Política de derechos de autor y mecanismo de reclamación.
- Información de contacto y soporte.
- Política de retención y eliminación de datos.

Los términos deben cubrir cuentas, conducta, publicaciones, licencias otorgadas por los usuarios, moderación, suspensión, limitaciones del servicio y jurisdicción aplicable. La redacción legal definitiva debería revisarla una persona profesional conocedora de los países donde se distribuirá la app.

## Requisitos de las fichas de tienda

Preparar para ambas tiendas:

- Nombre público y subtítulo.
- Descripción corta y descripción completa.
- Icono final.
- Capturas reales de las pantallas principales.
- Categoría adecuada.
- Clasificación por edades.
- URL de soporte.
- URL de política de privacidad.
- Correo de contacto.
- Cuenta demo para revisión.
- Instrucciones para acceder a funciones protegidas.
- Declaración de derechos sobre el contenido.

Google Play requiere adicionalmente:

- Cuenta de desarrollador de Google Play.
- Formulario Data Safety.
- Declaraciones de permisos.
- Cuestionario de contenido y anuncios.
- Prueba interna o cerrada cuando corresponda a la cuenta.
- Archivo AAB de producción.

Apple requiere adicionalmente:

- Membresía Apple Developer Program.
- Registro de la app en App Store Connect.
- App Privacy o Privacy Nutrition Label.
- Información de cumplimiento de exportación/cifrado.
- Información para App Review y TestFlight.
- Build firmado y asociado al bundle ID.

El backend y la cuenta demo deben permanecer disponibles durante toda la revisión.

## Build de producción Android

El perfil `preview` genera una distribución interna instalable. Para Google Play se necesita un Android App Bundle de producción:

```bash
cd /home/david/proyectos/BibliaAPP/mobile
npx eas-cli@latest build --platform android --profile production
```

Expo SDK 56 apunta a Android API 36, superior al requisito vigente documentado por Google Play de API 35 o posterior.

Referencia oficial:

- [Requisitos de nivel de API de Google Play](https://support.google.com/googleplay/android-developer/answer/11926878)

## Primera versión iOS para pruebas

No es obligatorio mantener manualmente una carpeta nativa `ios/`. EAS puede ejecutar el prebuild y compilar la aplicación principal en la nube usando `app.json`, `eas.json` y los config plugins.

### Opción A: simulador iOS sin cuenta Apple pagada

Agregar un perfil separado a `eas.json`:

```json
{
  "build": {
    "ios-simulator": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  }
}
```

Conservar también los perfiles ya existentes; el fragmento anterior muestra únicamente la sección nueva.

Generar el build:

```bash
cd /home/david/proyectos/BibliaAPP/mobile
npx eas-cli@latest build --platform ios --profile ios-simulator
```

La compilación ocurre en EAS y no requiere Apple Developer Program, pero el resultado necesita una Mac con iOS Simulator para ejecutarse.

Referencia oficial:

- [Builds para iOS Simulator con Expo](https://docs.expo.dev/build-reference/simulators/)

### Opción B: instalar en un iPhone real

Requiere Apple Developer Program y registrar el dispositivo:

```bash
cd /home/david/proyectos/BibliaAPP/mobile
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

El primer comando registra el UDID del iPhone. EAS puede gestionar el certificado y el perfil de aprovisionamiento ad hoc. El build solo se podrá instalar en los dispositivos incluidos en ese perfil.

Antes de este build se debe verificar:

- Disponibilidad del bundle ID `com.bibliaapp.mobile` en la cuenta Apple.
- Credenciales y certificados de Apple.
- Redirect URI del login con Google para el esquema `bibliaapp`.
- Capacidades y credenciales de notificaciones push/APNs.
- Comportamiento de permisos de fotos en iOS.
- Que las funciones exclusivas de Android estén correctamente ocultas.

### Opción C: TestFlight

Requiere Apple Developer Program y crear primero el registro de BibliaAPP en App Store Connect.

```bash
cd /home/david/proyectos/BibliaAPP/mobile
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Después de que Apple procese el build, se asigna a un grupo de pruebas en TestFlight. Los testers internos pueden probarlo primero; los testers externos pueden requerir Beta App Review.

Referencias oficiales:

- [Flujo de App Store Connect](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-workflow/)
- [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)

## Orden de trabajo recomendado

1. Instalar y validar el APK preview Android actual.
2. Reducir los permisos Android.
3. Implementar política de privacidad y enlaces legales dentro de la app.
4. Implementar eliminación de cuenta en backend, web y móvil.
5. Añadir reporte, bloqueo, filtrado y administración de moderación.
6. Resolver el inicio con Google en iOS mediante Sign in with Apple o una estrategia aceptable equivalente.
7. Auditar derechos de traducciones, imágenes, fuentes y contenido.
8. Crear un build para iOS Simulator y corregir incompatibilidades visuales o nativas.
9. Probar un build real mediante TestFlight.
10. Preparar fichas, formularios, cuenta demo y enviar primero a pistas internas o cerradas.
11. Enviar a revisión pública únicamente después de completar la lista anterior.

## Lista de verificación final

- [ ] Política de privacidad pública.
- [ ] Enlace de privacidad dentro de la app.
- [ ] Términos y condiciones.
- [ ] Reglas de comunidad.
- [ ] Eliminación de cuenta dentro de la app.
- [ ] Página web para eliminación de cuenta.
- [ ] Reporte de publicaciones y usuarios.
- [ ] Bloqueo de usuarios.
- [ ] Filtrado y proceso de moderación.
- [ ] Contacto de soporte visible.
- [ ] Estrategia de login de iOS aprobable.
- [ ] Permisos Android reducidos al mínimo.
- [ ] Derechos de contenido documentados.
- [ ] Data Safety de Google completado.
- [ ] App Privacy de Apple completado.
- [ ] Cuenta demo de revisión.
- [ ] Capturas, descripción, clasificación y metadatos.
- [ ] Build Android AAB probado en pista interna.
- [ ] Build iOS probado en simulador.
- [ ] Build iOS probado mediante TestFlight.
