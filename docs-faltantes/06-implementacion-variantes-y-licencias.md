# Implementación de variantes y licencias

Estado al 15 de julio de 2026: implementado en código; falta aplicar la migración y cargar los datos legales reales antes de generar el build público.

Este archivo conserva el checklist de publicación. La documentación técnica definitiva de los cambios implementados vive en:

- `docs-mobile/26-variantes-y-licencias-biblicas.md` para la aplicación móvil;
- `docs/control-acceso-biblias-y-variantes-web.md` para web y backend.

## Qué quedó implementado

- Un solo código móvil con variantes `internal` y `public`.
- Identificadores instalables en paralelo:
  - interna: `com.bibliaapp.mobile.internal`;
  - pública: `com.bibliaapp.mobile`.
- Esquemas OAuth separados: `bibliaapp-internal` y `bibliaapp`.
- Perfil EAS `internal` para el equipo y `production` para tiendas.
- Comunidad y grupos ocultos en el build público mientras no exista moderación completa.
- Google oculto en iOS público; permanece el acceso propio por correo y contraseña.
- Permisos amplios de almacenamiento, video y audio bloqueados en Android.
- Pantalla `Información legal` con descripción sin fines de lucro, enlaces y atribuciones de cada Biblia.
- Catálogo bíblico con capacidades independientes para leer, descargar, copiar, compartir, crear imágenes y usar audio.
- Protección en catálogo, libros, capítulos, descarga masiva, búsqueda, referencias, versículo del día, favoritos y subrayados.
- Descarga offline deshabilitada cuando la licencia no la permite y purga local después de una revocación confirmada por el catálogo.

## Activación en la base de datos

Aplicar primero [`docs/002-bible-licensing.sql`](../../docs/002-bible-licensing.sql) en la misma base donde existen `bible_bibles` y `users`.

En producción la protección es deliberadamente estricta: si la tabla `bible_licenses` no existe o una Biblia no tiene una fila activa, esa Biblia no aparece. Esto evita publicar accidentalmente una traducción sin derechos documentados.

Para cada traducción se debe registrar:

```text
bible_id
license_name
copyright_notice
attribution_text
source_url
catalog_scope = public | internal
status = active | disabled | revoked
can_read
can_download
can_copy
can_share
can_create_images
can_use_audio
cache_max_age_days
```

RVR1909 puede cargarse como `public` después de confirmar el ID asignado por el importador. ONBV debe conservar la atribución de CC BY-SA 4.0 y revisar si el tratamiento de versículos puente requiere cambios antes de activarla.

Las traducciones internas como RVR1960, NBLA u otras protegidas deben usar `catalog_scope = internal`. Solo serán visibles para:

- roles incluidos en `INTERNAL_BIBLE_ROLES` —por defecto únicamente `admin`—;
- usuarios con fila vigente en `user_bible_entitlements`.

Un rol o código de acceso no crea derechos de distribución. Este mecanismo solo aplica una licencia o permiso que ya debe existir por escrito.

## Variables para EAS

Configurar en el entorno de producción de EAS:

```text
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_PRIVACY_URL
EXPO_PUBLIC_SUPPORT_URL
EXPO_PUBLIC_ACCOUNT_DELETION_URL
EXPO_PUBLIC_TERMS_URL
EXPO_PUBLIC_COMMUNITY_GUIDELINES_URL
EXPO_PUBLIC_DEFAULT_BIBLE_ID
```

Las primeras cuatro son obligatorias para que `app.config.ts` permita crear el build público. El ID predeterminado debe corresponder a una Biblia pública activa.

En el servidor se recomienda configurar:

```text
DEFAULT_PUBLIC_BIBLE_ID=<id público real>
INTERNAL_BIBLE_ROLES=admin
```

La misma API puede servir a ambos binarios porque decide por licencia, sesión y entitlement; también se pueden usar dominios separados si se desea aislamiento operativo adicional.

## Builds

Build del equipo:

```bash
cd /home/david/proyectos/BibliaAPP/mobile
npx eas-cli@latest build --platform android --profile internal
```

Build público Android:

```bash
npx eas-cli@latest build --platform android --profile production
```

Primera prueba iOS interna:

```bash
npx eas-cli@latest build --platform ios --profile internal
```

No ejecutar el build `production` hasta que la migración, URLs legales y al menos una Biblia pública estén activos.

## Pendientes que siguen bloqueando tiendas

- Publicar la política de privacidad, términos, soporte y página de eliminación.
- Implementar la eliminación efectiva de cuenta y datos; hoy la app solo puede enlazar el punto de inicio configurado.
- Implementar reportes, bloqueo y moderación antes de volver a habilitar comunidad en producción.
- Importar y verificar RVR1909/ONBV, incluidas atribución, conteos y versículos puente.
- Registrar la ficha, capturas, Data Safety/App Privacy y una cuenta de revisión.
- Inspeccionar el Android Manifest final para confirmar los permisos reales del AAB.
- Probar que un usuario sin entitlement recibe `404` al consultar IDs internos de forma directa.
