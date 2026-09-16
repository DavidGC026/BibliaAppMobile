# Plan de integración compatible con API.Bible

Estado al 15 de julio de 2026: integración aprobada como dirección técnica, todavía no implementada. El repositorio actual no contiene una clave ni realiza llamadas a API.Bible.

Este documento resume la revisión de:

- `API.Bible Terms and Conditions`;
- `Strictly Non-commercial Use Agreement`;
- `Statement of Orthodoxy`;
- `Minimum Acceptable Use Agreement`.

No sustituye una revisión legal profesional ni las condiciones particulares de cada traducción.

## Decisión

Sí se puede integrar API.Bible, pero se utilizará como servicio de lectura controlada en línea. No se utilizará para descargar Biblias completas, copiarlas a MariaDB o redistribuirlas libremente desde SQLite.

Las Biblias obtenidas directamente de eBible.org, como RVR1909 u ONBV, permanecerán separadas y se regirán por la licencia de su fuente original. Los términos de API.Bible solo aplican al contenido obtenido mediante API.Bible.

## Lo que API.Bible no resuelve

Tener acceso técnico a una traducción en API.Bible no concede automáticamente una licencia del propietario. Para RVR1960, NBLA y otras traducciones protegidas se debe comprobar simultáneamente:

1. que la traducción esté habilitada para nuestra aplicación en API.Bible;
2. que exista la licencia directa del propietario cuando API.Bible o el titular la exijan;
3. que se cumplan territorio, dispositivos, formato, citas y demás condiciones particulares.

Por tanto, API.Bible no permite evadir el requisito de licencia de RVR1960.

## Arquitectura acordada

```text
App móvil / web
        |
        v
Backend BibliaAPP
        |
        v
API.Bible
```

- La app nunca conocerá la clave de API.Bible.
- El backend funcionará como proxy autenticado y controlará catálogo, capacidades, cuotas y atribuciones.
- El móvil solicitará únicamente el capítulo o pasaje que el usuario esté leyendo.
- El texto protegido no se guardará de forma permanente en MariaDB.
- El texto protegido no se incluirá en builds, archivos de importación ni repositorios.
- La respuesta del backend conservará el texto y metadatos entregados por API.Bible sin modificaciones.

La variable del servidor será:

```text
API_BIBLE_KEY=<clave privada>
```

Nunca se utilizarán nombres como:

```text
EXPO_PUBLIC_API_BIBLE_KEY
NEXT_PUBLIC_API_BIBLE_KEY
```

La clave tampoco debe pegarse en documentación, código, tickets, capturas o registros de consola.

## Tipos de fuente del catálogo

El catálogo deberá diferenciar al menos:

```text
local
ebible
api_bible
```

Para `api_bible` se guardará únicamente metadata operativa:

```text
source_type = api_bible
external_bible_id
name
abbreviation
copyright_notice
attribution_text
ip_holder_url
license_reference
territory
status
last_verified_at
```

No se copiarán libros, capítulos o versículos completos a `bible_verses`.

## Capacidades predeterminadas

Toda Biblia de API.Bible comenzará con estas capacidades:

```text
can_read = true
can_download = false
can_copy = false
can_share = false
can_create_images = false
can_use_audio = false
```

Una capacidad solo podrá cambiar a `true` cuando exista evidencia escrita en los términos de esa traducción o autorización directa del titular.

`can_use_audio` significará reproducir audio proporcionado como audio por API.Bible. Nunca autorizará convertir texto protegido a voz. El texto a voz permanecerá desactivado salvo permiso expreso; para dominio público o Creative Commons se revisará primero la licencia concreta.

## Descarga, caché y retirada

Para contenido de API.Bible:

- No se ofrecerá descarga completa en móvil o escritorio.
- No se utilizará `/api/verses/bulk` para ese tipo de fuente.
- No se reconstruirá una Biblia solicitando todos sus capítulos consecutivamente.
- No se conservará contenido protegido en favoritos, subrayados, widgets o notificaciones después de una revocación.
- Si se autoriza alguna caché, se registrará `cached_at`, `last_verified_at` y fecha de expiración.
- Toda caché autorizada se comprobará al menos cada 30 días.
- Una solicitud de retirada deberá propagarse a backend, web, móvil y escritorio dentro de 24 horas.
- Una terminación o desactivación de cuenta/plan deberá eliminar el contenido dentro de 72 horas.

La purga actual del catálogo móvil es una base útil, pero todavía no garantiza esos plazos en dispositivos que permanezcan desconectados. Se requerirá expiración local obligatoria y bloqueo de lectura al vencer.

## Atribución obligatoria

La integración deberá mostrar:

- nombre y abreviatura oficial de la traducción en cada contexto de lectura;
- copyright y atribución obtenidos de los metadatos oficiales;
- enlace desde cada pantalla de lectura a la información completa de copyright;
- enlace al sitio del titular de derechos cuando corresponda;
- enlace visible a `https://api.bible` para el Starter Plan;
- requisitos adicionales de la licencia directa de cada titular.

La pantalla `Información legal` existente será ampliada, pero no será suficiente por sí sola: el lector, versículo del día, búsqueda, favoritos, subrayados, imágenes y contenido compartido también deben conservar la identificación de la traducción.

## Copia, impresión, compartir e imágenes

La implementación deberá impedir por defecto:

- copiar texto protegido al portapapeles;
- compartirlo mediante el sistema operativo;
- crear o descargar imágenes con el texto;
- exportarlo dentro de notas o PDF;
- imprimir más de 100 versículos;
- utilizar favoritos o subrayados como forma indirecta de conservar texto revocado;
- distribuir archivos que permitan reconstruir la traducción.

Los controles actuales del lector móvil ayudan, pero todavía existen flujos secundarios de compartir desde favoritos y subrayados. La app de escritorio también permite descargar versiones completas y deberá adaptarse antes de habilitar contenido de API.Bible.

## FUMS, seguridad y cuotas

- La web deberá implementar Fair Use Management System (FUMS) conforme a la documentación de API.Bible.
- Se confirmará con API.Bible si FUMS o un mecanismo equivalente también es obligatorio para móvil y escritorio.
- El backend aplicará límites por usuario, dispositivo, Bible ID y dirección IP.
- Nunca se intentará evadir cuotas mediante múltiples cuentas, proyectos o claves.
- Se confirmará con soporte si los binarios `public` e `internal` cuentan como dos aplicaciones; los términos indican que los servicios de pago se asocian a una sola aplicación.
- Los identificadores enviados a FUMS no contendrán datos personales sin proteger.
- La política de privacidad deberá explicar el seguimiento requerido por FUMS.

## Uso no comercial y ortodoxia

BibliaAPP se mantendrá sin:

- anuncios;
- compras dentro de la app;
- suscripciones pagadas o freemium;
- patrocinios o promociones comerciales;
- ingresos derivados del acceso al contenido.

Únicamente podrían existir enlaces menores y no intrusivos para diezmos o donaciones dentro de la excepción revocable de API.Bible. No se implementarán sin revisar nuevamente las condiciones vigentes.

La persona u organización responsable de la cuenta deberá poder aceptar de buena fe la declaración de ortodoxia. Esto no puede resolverse únicamente mediante código.

## IA, marcas y contenido comunitario

- El contenido obtenido mediante API.Bible no se utilizará para entrenamiento, ajuste, evaluación o construcción de datasets de IA.
- No se usarán logotipos de API.Bible, American Bible Society, traducciones o titulares sin autorización escrita.
- La comunidad pública continuará desactivada mientras no existan filtros, reportes, bloqueo y moderación suficientes.
- El contenido de API.Bible no se combinará con publicaciones objetables o usos incompatibles con sus estándares de uso aceptable.

## Fases de implementación

### Fase 1: adaptador seguro del backend

- Crear cliente de API.Bible exclusivo del servidor.
- Validar que `API_BIBLE_KEY` exista sin exponer su valor.
- Implementar timeout, manejo de errores y límites de solicitudes.
- Añadir `source_type` y `external_bible_id` al catálogo.
- Obtener catálogo y metadata legal sin importar los textos.

### Fase 2: lectura en línea

- Resolver libros, capítulos, pasajes y búsqueda mediante el adaptador.
- Conservar íntegramente el formato recibido.
- Impedir bulk y descarga para `api_bible`.
- Evitar caché persistente en MariaDB y SQLite.

### Fase 3: atribución y capacidades

- Añadir copyright contextual en móvil y web.
- Añadir enlace a la página legal y a API.Bible.
- Desactivar copiar, compartir, imágenes, audio y exportaciones por defecto.
- Revisar favoritos, subrayados, widgets, notificaciones y notas.

### Fase 4: cumplimiento operativo

- Implementar FUMS en web.
- Implementar verificación de licencias y metadata cada 30 días.
- Implementar retirada global en 24/72 horas.
- Añadir límites de territorio, dispositivos, impresión y cuotas cuando correspondan.
- Adaptar la aplicación de escritorio.

### Fase 5: pruebas y activación

- Configurar la clave directamente en el servidor.
- Consultar los Bible IDs autorizados para la cuenta.
- Probar primero una traducción de bajo riesgo.
- Validar atribución, revocación y ausencia de almacenamiento persistente.
- Solicitar aclaración escrita a API.Bible ante cualquier condición ambigua.

## Criterio de terminado

La integración estará lista cuando:

- ninguna clave sea accesible desde el binario o navegador;
- una Biblia `api_bible` no pueda descargarse ni reconstruirse mediante endpoints alternos;
- el backend no almacene permanentemente su texto;
- la atribución y enlaces aparezcan en todos los contextos requeridos;
- FUMS funcione en web;
- exista purga verificable dentro de los plazos contractuales;
- cada capacidad activa tenga evidencia documental;
- móvil, web y escritorio superen pruebas de revocación, copia, descarga y acceso directo;
- la cuenta y cada traducción estén activas y licenciadas para la aplicación correspondiente.
