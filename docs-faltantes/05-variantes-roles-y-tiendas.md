# Variantes pública e interna, roles y permisos bíblicos

Estado revisado el 15 de julio de 2026.

## Decisión de arquitectura

BibliaAPP mantendrá una sola base de código móvil y generará dos variantes:

1. Una variante pública para Google Play y App Store.
2. Una variante interna para desarrollo y pruebas del equipo.

Ambas compartirán interfaz, funciones, cuentas, comunidad, notas y lógica general. La diferencia estará en la identidad del binario, la URL del backend, el canal de actualizaciones y el catálogo bíblico autorizado.

No se creará una copia independiente de la carpeta `mobile`, porque mantener dos proyectos terminaría produciendo diferencias y errores entre versiones.

## Diseño general

```text
Un solo repositorio mobile
├── BibliaAPP pública
│   └── API pública → RVR1909, ONBV y otras traducciones abiertas
└── BibliaAPP interna
    └── API interna → contenido de pruebas y traducciones autorizadas
```

La aplicación pública conservará los identificadores actuales:

```text
Android: com.bibliaapp.mobile
iOS:     com.bibliaapp.mobile
```

La variante interna utilizará identificadores independientes, por ejemplo:

```text
Android: com.bibliaapp.mobile.internal
iOS:     com.bibliaapp.mobile.internal
```

Esto permite instalar ambas variantes simultáneamente y mantiene separados SQLite, SecureStore, cachés, notificaciones y demás datos locales.

Referencia técnica:

- [Variantes de aplicaciones con Expo](https://docs.expo.dev/build-reference/variants/)
- [Variables de entorno en EAS](https://docs.expo.dev/eas/environment-variables/usage/)

## Roles y permisos bíblicos son conceptos distintos

Los roles existentes deben controlar responsabilidades dentro del producto:

```text
admin   → administración y moderación
editor  → contenido editorial y devocionales
user    → uso normal de la aplicación
```

No se debe conceder acceso a una traducción protegida únicamente por tener el rol `admin`. Los derechos de contenido deben representarse mediante permisos independientes, por ejemplo:

```text
user_bible_entitlements
  user_id
  bible_id
  can_read
  can_download
  granted_by
  granted_at
  expires_at nullable
```

De esta manera:

- Un administrador público puede moderar sin recibir Biblias protegidas.
- Un usuario autorizado puede leer una traducción concreta sin convertirse en administrador.
- Lectura y descarga offline pueden concederse por separado.
- Un permiso puede revocarse o caducar.
- Cada concesión queda auditada.

## Autoridad del backend

La aplicación nunca será la autoridad para decidir qué Biblia puede leer una persona. Ocultar una traducción en React Native no impide consultar manualmente la API.

Todos los endpoints bíblicos deben comprobar variante, traducción y permisos, incluyendo:

- `/api/bibles`
- `/api/books`
- `/api/verses`
- `/api/verses/bulk`
- Búsqueda bíblica.
- Versículo del día.
- Widgets y notificaciones.
- Descargas offline.
- Generador de imágenes y funciones de compartir.

Una solicitud pública de un `bibleId` protegido debe responder `403` o `404`, aunque el identificador sea conocido. La API pública no debe poseer credenciales directas para leer el almacenamiento protegido.

No se confiará en un encabezado como `APP_VARIANT=internal` enviado por el cliente, porque puede falsificarse. La separación debe depender del host, credenciales del despliegue, usuario autenticado y permisos mantenidos por el servidor.

## Datos compartidos y datos separados

Se recomienda compartir la base principal para:

- Usuarios y sesiones.
- Perfiles y preferencias.
- Comunidad, grupos y publicaciones.
- Notas, favoritos y subrayados.
- Devocionales y planes.

El contenido bíblico debe aislarse por origen o autorización:

```text
Base principal compartida
├── cuentas y comunidad
├── notas y actividad
└── permisos de traducciones

Almacenamiento bíblico público
└── traducciones abiertas

Fuente bíblica interna o licenciada
└── traducciones protegidas autorizadas
```

Puede tratarse de bases físicas distintas o de un servicio bíblico separado. La condición indispensable es que el despliegue público no pueda entregar textos protegidos por error.

## Comportamiento de la variante pública

La aplicación enviada a tiendas debe:

- Mostrar por defecto una traducción abierta, inicialmente RVR1909.
- Ofrecer ONBV y las demás traducciones abiertas aprobadas.
- No incluir textos protegidos dentro del binario.
- No descargar una traducción protegida sin permiso expreso.
- No revelar traducciones protegidas mediante enumeración de IDs.
- Eliminar una copia local cuando se revoque el permiso correspondiente.
- Mostrar licencia, atribución y procedencia de cada edición.
- Tener una cuenta demo para revisión con una experiencia representativa y legalmente publicable.

El valor actual `DEFAULT_BIBLE_ID` deberá convertirse en configuración por variante o, preferentemente, obtenerse del catálogo autorizado del servidor.

## Comportamiento de la variante interna

La variante interna podrá utilizar:

- Backend interno.
- Funciones experimentales.
- Catálogos de prueba.
- Traducciones para las que exista autorización válida de desarrollo o licencia aplicable.
- Herramientas adicionales de diagnóstico.

Que una aplicación sea interna no concede derechos sobre NBLA, RVR60 u otra traducción protegida. El almacenamiento, acceso, caché y distribución deberán ajustarse al permiso del titular o a las condiciones de la API utilizada.

## Caché y descarga offline

El sistema móvil actual permite descargar Biblias completas a SQLite. Cada traducción debe declarar capacidades explícitas:

```text
offline_allowed
download_allowed
copy_allowed
share_allowed
audio_allowed
```

Si una licencia o API solo permite transmisión en línea:

- No mostrar el botón de descarga.
- No almacenar libros completos en SQLite.
- Limitar la caché a lo estrictamente permitido.
- Purgar datos al cerrar sesión, caducar o revocar el permiso cuando corresponda.
- Evitar que widgets, imágenes compartidas o exportaciones funcionen como mecanismos de extracción masiva.

## Consideraciones de App Store

Apple exige que las funciones de la aplicación sean claras para usuarios y revisión; no permite funciones ocultas, inactivas o no documentadas. Si existen capacidades que dependen de una cuenta, deben explicarse en las notas de revisión y facilitarse para revisión cuando corresponda.

La app pública no tendrá un modo desarrollador secreto para habilitar contenido protegido. Los roles administrativos visibles y legítimos pueden existir, pero no se utilizarán para esconder funcionalidad destinada a evadir revisión.

Referencias:

- [App Review Guidelines, acceso para revisión](https://developer.apple.com/app-store/review/guidelines/)
- [App Review Guidelines 2.3.1, funciones ocultas](https://developer.apple.com/app-store/review/guidelines/#accurate-metadata)

## Consideraciones de Google Play

Google Play puede solicitar evidencia de los derechos para usar contenido de terceros. Su política identifica como posible infracción las reproducciones completas de libros que no estén en dominio público y las descargas locales no autorizadas.

Ocultar una Biblia mediante un rol no sustituye la licencia. Si una traducción protegida se habilita en la app pública, se deberá conservar y poder presentar la autorización correspondiente.

Referencias:

- [Propiedad intelectual en Google Play](https://support.google.com/googleplay/android-developer/answer/9888072)
- [Metadatos de Google Play](https://support.google.com/googleplay/android-developer/answer/9898842)

## Perfiles EAS previstos

El esquema conceptual de compilación será:

```json
{
  "build": {
    "internal": {
      "distribution": "internal",
      "channel": "internal",
      "env": {
        "APP_VARIANT": "internal",
        "EXPO_PUBLIC_API_URL": "https://internal-api.example.com"
      }
    },
    "production": {
      "channel": "production",
      "env": {
        "APP_VARIANT": "public",
        "EXPO_PUBLIC_API_URL": "https://api.example.com"
      }
    }
  }
}
```

Las URLs son marcadores y deberán reemplazarse por los dominios definitivos. Los canales de EAS Update también deben permanecer separados para impedir que una actualización interna llegue al binario público.

## Pruebas obligatorias antes de tiendas

- [ ] La app pública solo lista traducciones abiertas o expresamente licenciadas.
- [ ] Consultar directamente un ID protegido desde la API pública devuelve `403` o `404`.
- [ ] Los endpoints normal y bulk aplican las mismas reglas.
- [ ] Búsqueda, versículo del día y widget nunca eligen una traducción no autorizada.
- [ ] La Biblia predeterminada pública es válida y abierta.
- [ ] La app pública no contiene textos protegidos empaquetados.
- [ ] SQLite público no conserva datos de una variante interna.
- [ ] Revocar un permiso impide nuevas lecturas y elimina caché cuando corresponde.
- [ ] Las atribuciones aparecen en móvil y web.
- [ ] Las notas de revisión describen las funciones que dependen de cuenta.
- [ ] Se dispone de evidencia de derechos para cualquier contenido protegido habilitado.
- [ ] Los canales EAS `internal` y `production` no se cruzan.

## Orden recomendado de implementación

1. Convertir la configuración Expo a una configuración dinámica por variante.
2. Crear identificadores y perfiles EAS separados.
3. Separar la API pública y la interna.
4. Incorporar metadatos legales y capacidades por traducción.
5. Crear permisos bíblicos independientes de los roles.
6. Proteger todos los endpoints en el backend.
7. Adaptar catálogo, valor predeterminado y descargas offline.
8. Ejecutar pruebas de aislamiento y preparar la cuenta demo de tiendas.

## Criterio de terminado

La separación estará terminada cuando ambos binarios puedan instalarse juntos, cada uno use exclusivamente su backend y canal, la API pública sea incapaz de entregar contenido protegido sin autorización, los permisos bíblicos estén separados de los roles administrativos y las pruebas demuestren que no existen fugas por búsqueda, caché, widgets, descargas o enumeración de IDs.
