# Implementación pendiente de Open Nueva Biblia Viva

Estado revisado el 15 de julio de 2026.

## Decisión

La `Biblica® Open Nueva Biblia Viva™` (`ONBV`, fuente `spaonbv`) queda aprobada como candidata principal de español moderno para BibliaAPP. Puede almacenarse en nuestro servidor y distribuirse en móvil y web sin depender de una API externa, siempre que se cumplan la licencia y la atribución.

Esta es una evaluación técnica de las condiciones publicadas. Debe incluirse en la revisión legal general antes del lanzamiento comercial.

## Fuentes oficiales

- [Ficha, licencia y descargas](https://ebible.org/find/details.php?id=spaonbv)
- [Paquete oficial VPL, XML y SQL](https://ebible.org/Scriptures/spaonbv_vpl.zip)
- [Open.Bible](https://www.open.bible/)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

Conservar el ZIP oficial original, su URL, fecha de descarga y SHA-256. No obtener el texto de repositorios intermedios ni copiarlo de páginas HTML.

## Licencia y atribución

La edición está publicada bajo CC BY-SA 4.0. Para la primera publicación se conservará el texto sin cambios y el título oficial.

El aviso visible debe incluir como mínimo:

```text
Biblica® Open Nueva Biblia Viva™
Copyright © 2006, 2008 by Biblica, Inc.
“Biblica” es una marca registrada en la oficina de Patentes y Marcas
de los Estados Unidos por Biblica, Inc. Usado con permiso.
“Biblica” is a trademark registered in the United States Patent and
Trademark Office by Biblica, Inc. Used with permission.
```

También se debe:

- Identificar y enlazar `CC BY-SA 4.0`.
- Indicar que la obra original está disponible gratuitamente en `www.biblica.com` y `open.bible`.
- Mostrar la atribución desde el selector o una pantalla accesible de información.
- No usar la marca Biblica como marca o patrocinadora de BibliaAPP.
- No incorporar imágenes sin verificar su licencia individual.
- Identificar cualquier cambio y publicar el texto derivado bajo la misma licencia.

La obligación ShareAlike debe aplicarse al texto y a sus derivados. No se asumirá que obliga por sí sola a relicenciar todo el código de la aplicación; la separación deberá confirmarse en la revisión legal.

## Resultado de inspeccionar el ZIP

El paquete oficial contiene `spaonbv_vpl.sql`, `spaonbv_vpl.xml`, `spaonbv_vpl.txt`, el aviso legal, una firma y estilos. La inspección produjo:

- 66 libros.
- 1,189 capítulos.
- 29,102 registros de texto.
- 1,147 registros que representan rangos de dos o más versículos.
- Solo texto bíblico; fueron eliminados títulos, notas, introducciones, párrafos y formato.
- Aviso editorial fechado el 21 de mayo de 2025.
- Archivos del ZIP generados el 11 de junio de 2026.

Ejemplos de rangos: `Génesis 1:11-12`, `Génesis 1:14-15` y `Génesis 2:19-20`.

## No ejecutar el SQL directamente

El archivo incluye `USE sofia`, `DROP TABLE`, creación de una tabla MyISAM y bloqueos. Por lo tanto:

- No ejecutarlo contra ninguna base de producción.
- Leer únicamente los datos mediante nuestro importador.
- Importar dentro de una transacción y con consultas parametrizadas.
- Mapear códigos como `GEN`, `EXO`, `MAT` y `REV` a `idBook`.
- Validar libros, capítulos, referencias y texto antes de activar la edición.

## Soporte necesario para rangos

El modelo actual guarda un único campo `verse`. ONBV requiere conservar inicio y final sin duplicar texto:

```text
bible_verses
  idVerse
  idBible
  idBook
  chapter
  verse_start
  verse_end nullable
  text
```

Si no existe final, se mostrará `11`; si existe, se mostrará `11-12`. Búsquedas, favoritos, notas, subrayados, enlaces, lectura por voz y APIs deberán conservar el rango completo. Las Biblias existentes migrarán su número actual a `verse_start` y dejarán `verse_end` vacío.

No se debe duplicar un texto combinado en cada versículo porque produciría referencias y resultados engañosos.

## Formato elegido

VPL/SQL es suficiente para la primera implementación de lectura por versículo. Si después se desean párrafos, poesía, títulos, notas u otra estructura editorial, se reimportará desde el USFX o USFM oficial; esos elementos no pueden reconstruirse desde este SQL simplificado.

## Pendientes

- [ ] Descargar nuevamente el ZIP oficial al iniciar el trabajo.
- [ ] Archivar ZIP, URL, fecha y SHA-256.
- [ ] Guardar licencia y atribución en la base de datos.
- [ ] Migrar backend, API, móvil y web para rangos de versículos.
- [ ] Crear un importador que no ejecute el SQL del proveedor.
- [ ] Validar 66 libros, 1,189 capítulos y los rangos esperados.
- [ ] Comparar muestras con la fuente oficial.
- [ ] Probar búsqueda, notas, favoritos, subrayados, compartir y voz.
- [ ] Añadir la pantalla visible de atribución.
- [ ] Confirmar que el texto importado no fue modificado.
- [ ] Mantener ONBV oculta hasta aprobar el reporte de importación.
- [ ] Incluir la licencia en la revisión legal previa a tiendas.

ONBV podrá activarse cuando el archivo y su hash estén archivados, los rangos se representen sin pérdida, la atribución sea visible y las pruebas confirmen que el contenido coincide con la fuente.
