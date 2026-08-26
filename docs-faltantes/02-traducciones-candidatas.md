# Cuatro traducciones candidatas para el lanzamiento

Estado revisado el 15 de julio de 2026.

## Resultado

Las cuatro traducciones siguientes tienen una fuente descargable, formatos técnicos utilizables y una declaración expresa de dominio público o licencia abierta. Las recomendadas para el primer lanzamiento son RVR1909, ONBV y VBL. BLL puede importarse para pruebas, pero no debería ser la versión predeterminada mientras siga identificándose como borrador.

| Prioridad | Traducción | Estado | Formato disponible | Uso recomendado |
|---|---|---|---|---|
| A | Reina-Valera 1909 | Dominio público | USFM, USFX, VPL/SQL, SWORD, texto | Principal, completa y offline |
| A | Biblica Open Nueva Biblia Viva 2008 | CC BY-SA 4.0 | USFM, USFX, VPL/SQL, SWORD | Alternativa moderna, completa y offline |
| A | Versión Biblia Libre | CC BY-SA 4.0 | USFM, USFX, VPL/SQL, SWORD | Alternativa contemporánea, completa y offline |
| B | Santa Biblia libre Latinoamericano | Dominio público, borrador | USFM, USFX, VPL/SQL, SWORD | Piloto y evaluación editorial |

## 1. Santa Biblia — Reina-Valera 1909

### Evaluación

- ID de fuente: `spaRV1909`.
- Abreviatura recomendada en BibliaAPP: `RVR1909`.
- Canon protestante completo.
- Estado declarado por la fuente: dominio público.
- Ventaja principal: nombre Reina-Valera conocido por el público hispanohablante.
- Riesgo principal: ortografía y lenguaje antiguos.
- Recomendación: versión predeterminada inicial.

### Archivos que sirven

La fuente ofrece USFM, texto por capítulos, VPL/SQL y módulo SWORD. Para nuestro importador conviene recibir el ZIP USFM original. VPL/SQL puede servir como formato alternativo de comprobación.

Fuente y licencia:

- [Ficha y descargas de RVR1909](https://ebible.org/find/details.php?id=spaRV1909)
- [Paquete oficial VPL/SQL de RVR1909](https://ebible.org/Scriptures/spaRV1909_vpl.zip)
- [Declaración de dominio público](https://ebible.org/spaRV1909/copyright.htm)

El paquete VPL/SQL oficial fue inspeccionado el 15 de julio de 2026. Es técnicamente utilizable, pero debe transformarse mediante nuestro importador y no ejecutarse directamente. Véase [Implementación pendiente de Reina-Valera 1909](./04-rvr1909-implementacion-pendiente.md).

### Condiciones internas

- Mantener el nombre exacto de la edición.
- Conservar la URL y declaración de dominio público.
- No mezclar silenciosamente versículos de RVR1960 u otras revisiones.
- Documentar cualquier corrección tipográfica propia.

## 2. Biblica Open Nueva Biblia Viva 2008

### Evaluación

- ID de fuente: `spaonbv`.
- Abreviatura oficial: `ONBV`.
- Biblia completa.
- Licencia: Creative Commons Attribution-ShareAlike 4.0 International.
- Ventaja principal: español moderno y titular institucional claramente identificado.
- Riesgo principal: atribución obligatoria, marca registrada y obligación ShareAlike para derivados.
- Recomendación: segunda versión del catálogo y alternativa moderna principal.

### Archivos que sirven

La fuente ofrece ZIP USFM, USFX, VPL/SQL, SWORD, texto y EPUB. Se debe utilizar preferentemente el ZIP USFM sin modificar.

Fuente, archivos y licencia:

- [Ficha y descargas de ONBV](https://ebible.org/find/details.php?id=spaonbv)
- [Paquete oficial VPL/SQL de ONBV](https://ebible.org/Scriptures/spaonbv_vpl.zip)
- [Open.Bible](https://www.open.bible/)

El paquete VPL/SQL oficial fue inspeccionado el 15 de julio de 2026. Es técnicamente utilizable, pero debe transformarse mediante nuestro importador y no ejecutarse directamente. Además, contiene referencias que agrupan varios versículos. Véase [Implementación pendiente de Open Nueva Biblia Viva](./03-onbv-implementacion-pendiente.md).

### Atribución obligatoria

La aplicación debe conservar el aviso indicado por la fuente, incluyendo:

```text
Biblica® Open Nueva Biblia Viva™
Copyright © 2006, 2008 by Biblica, Inc.
```

También debe informar que la obra está bajo CC BY-SA 4.0 y enlazar el origen. No deben copiarse automáticamente imágenes adjuntas, porque su licencia puede ser diferente de la del texto.

### Condiciones internas

- Distribuir inicialmente el texto sin modificaciones.
- Mantener el título oficial.
- Mostrar atribución desde el selector o una pantalla de información de la versión.
- Si se modifica el texto, registrar los cambios y publicar el derivado bajo la misma licencia.

## 3. Versión Biblia Libre

### Evaluación

- ID de fuente: `spavbl`.
- Abreviatura: `VBL`.
- Antiguo y Nuevo Testamento completos.
- Traductores: Jonathan Gallagher y Shelly Barrios de Avila.
- Licencia: Creative Commons Attribution-ShareAlike 4.0.
- Ventaja principal: lenguaje contemporáneo y archivos técnicos completos.
- Riesgo principal: deben respetarse cuidadosamente el nombre, atribución y condiciones sobre modificaciones.
- Recomendación: tercera versión pública.

### Archivos que sirven

La fuente proporciona ZIP USFM, USFX, VPL/SQL, SWORD, texto y EPUB.

Fuente, archivos y licencia:

- [Ficha y descargas de VBL](https://ebible.org/details.php?id=spavbl)
- [Introducción y condiciones de VBL](https://ebible.org/spavbl/FRT01.htm)

### Condiciones internas

- Mostrar copyright, traductores, fuente y CC BY-SA 4.0.
- Distribuir inicialmente el texto exacto, sin modernizaciones automáticas.
- No incluir imágenes de la publicación salvo que su licencia individual también lo permita.
- Registrar y publicar bajo la misma licencia cualquier adaptación futura.

## 4. Santa Biblia libre Latinoamericano

### Evaluación

- ID de fuente: `spabll`.
- Abreviatura: `BLL`.
- Variante: español latinoamericano.
- Estado declarado: dominio público.
- Incluye el canon de 66 libros y libros deuterocanónicos/adicionales.
- Ventaja principal: lenguaje latinoamericano, dominio público y disponibilidad de USFM.
- Riesgo principal: la propia fuente la identifica como borrador en revisión activa.
- Recomendación: importar en ambiente de pruebas, someter a revisión editorial y no usar como predeterminada inicialmente.

### Archivos que sirven

La fuente ofrece ZIP USFM, USFX, VPL/SQL, SWORD, texto y EPUB.

Fuente, archivos y estado:

- [Ficha y descargas de BLL](https://ebible.org/details.php?id=spabll)

### Condiciones internas

- Mostrar claramente que es una versión en revisión si se publica antes de quedar estable.
- Decidir si BibliaAPP soportará únicamente 66 libros o también deuterocanónicos.
- No asignar IDs canónicos improvisados a libros adicionales.
- Mantener una tabla de mapeo separada para cánones diferentes.

## Alternativa de reserva

La `Santa Biblia libre para el mundo` (`spablm`) también se declara de dominio público y ofrece USFM, pero usa variante de España y actualmente está marcada como borrador. Puede sustituir a BLL si se busca español europeo.

- [Ficha y descargas de SBLM](https://ebible.org/details.php?id=spablm)

## Formato que debes conseguir

Para cada traducción, el paquete preferido es:

1. ZIP USFM original del proveedor.
2. Archivo o página de licencia/copyright.
3. URL exacta de descarga.
4. Fecha de descarga.
5. ZIP VPL/SQL opcional para validar el resultado.

No necesitamos código ejecutable de terceros. Necesitamos los archivos de texto fuente y la licencia. No deben convertirse previamente a JSON ni copiarse desde páginas web, porque eso dificulta verificar estructura y procedencia.

## Compatibilidad con el servidor actual

El backend actual almacena:

```text
bible_bibles
  idBible, abreviation, name

bible_verses
  idVerse, idBible, idBook, chapter, verse, text

bible_books
  idBook, name
```

USFM se puede mapear directamente a `idBook`, `chapter`, `verse` y `text`. Sin embargo, antes de importar producción falta almacenar metadatos legales. Se recomienda añadir una tabla como:

```text
bible_licenses
  bible_id
  source_id
  license_id
  copyright_notice
  attribution
  source_url
  source_downloaded_at
  source_sha256
  offline_allowed
  modification_allowed
  commercial_use_allowed
  status
```

También conviene ampliar la respuesta de `/api/bibles` para que móvil y web puedan mostrar atribución, licencia, estado de borrador y disponibilidad offline.

## Importador que se construirá

El importador debe:

1. Aceptar un ZIP USFM y un manifiesto legal.
2. Validar que el ZIP no contiene rutas inseguras ni ejecutables.
3. Calcular SHA-256 del archivo original.
4. Leer identificadores USFM estándar como `GEN`, `EXO`, `MAT` y `REV`.
5. Mapear los 66 libros sin depender del nombre traducido.
6. Separar marcadores, títulos y notas del texto visible.
7. Importar dentro de una transacción.
8. Ser idempotente para una edición concreta.
9. Validar número de libros, capítulos, versículos duplicados y versículos vacíos.
10. Guardar licencia y atribución antes de activar la Biblia.
11. Mantener la nueva versión oculta hasta superar validación.
12. Generar un reporte de importación y diferencias.

## Orden recomendado de importación

1. `spaRV1909` como prueba del importador y versión predeterminada.
2. `spaonbv` para validar atribución y CC BY-SA.
3. `spavbl` como segunda traducción moderna.
4. `spabll` solamente en staging hasta completar revisión editorial y soporte de canon.

## Criterio para aprobar una traducción

- [ ] Fuente original identificada.
- [ ] Licencia permite servidor y aplicación móvil.
- [ ] Uso comercial aclarado.
- [ ] Uso offline aclarado.
- [ ] Atribución completa.
- [ ] Archivo original y SHA-256 conservados.
- [ ] USFM válido.
- [ ] Canon y libros conocidos.
- [ ] Sin versículos duplicados o faltantes inesperados.
- [ ] Revisión de muestras representativas.
- [ ] Nombre y abreviatura no inducen a confusión con otra edición.
- [ ] Aviso legal visible en móvil y web.
