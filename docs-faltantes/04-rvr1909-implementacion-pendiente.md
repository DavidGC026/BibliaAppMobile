# Implementación pendiente de Reina-Valera 1909

Estado revisado el 15 de julio de 2026.

## Decisión

La `Santa Biblia — Reina Valera 1909` (`RV1909`, fuente `spaRV1909`) queda aprobada como primera traducción para validar el importador y como candidata a versión inicial predeterminada. La fuente la declara de dominio público, por lo que puede alojarse directamente en nuestro servidor y distribuirse offline sin depender de una API.

Esta edición no debe confundirse con Reina-Valera 1960 ni combinarse con ella. La declaración de la fuente debe conservarse como evidencia y formar parte de la revisión legal general previa al lanzamiento.

## Fuentes oficiales

- [Ficha, declaración y descargas](https://ebible.org/find/details.php?id=spaRV1909)
- [Paquete oficial VPL, XML y SQL](https://ebible.org/Scriptures/spaRV1909_vpl.zip)
- [Declaración de dominio público](https://ebible.org/spaRV1909/copyright.htm)

Conservar el ZIP oficial original, URL, fecha de descarga y SHA-256. El catálogo debe mostrar el título y la abreviatura de forma que no induzcan a pensar que se trata de RVR1960.

## Resultado de inspeccionar el ZIP

El paquete contiene `spaRV1909_vpl.sql`, `spaRV1909_vpl.xml`, `spaRV1909_vpl.txt`, el aviso de dominio público, una firma y estilos. La inspección produjo:

- 66 libros.
- 1,189 capítulos.
- 31,084 registros de versículos.
- Cero rangos de versículos en el archivo VPL/SQL.
- Solo texto bíblico; fueron eliminados títulos, notas, introducciones, párrafos y formato.
- Fuente editorial identificada como dominio público y fechada el 13 de diciembre de 2013.
- Archivos del ZIP generados el 11 de junio de 2026.

La ausencia de rangos hace que esta edición encaje en el modelo actual con un versículo por registro. Aun así, el importador común deberá soportar rangos para ONBV y futuras traducciones.

## No ejecutar el SQL directamente

El SQL incluye `USE sofia`, `DROP TABLE`, creación de una tabla MyISAM y bloqueos. Por seguridad:

- No ejecutarlo directamente contra desarrollo ni producción.
- Extraer solamente las filas mediante nuestro importador.
- Utilizar una transacción y consultas parametrizadas.
- Mapear los códigos estándar de libros a `idBook`.
- Recortar únicamente espacios técnicos de los bordes, sin modernizar ortografía ni puntuación.
- Validar que no se mezcló contenido de otras ediciones Reina-Valera.

## Formato elegido

VPL/SQL es suficiente para la primera implementación de lectura por versículo y es el mejor caso inicial para probar el importador. Si posteriormente se requieren títulos, párrafos, poesía, notas o palabras de Jesús, se deberá usar el USFX o USFM oficial.

## Atribución y presentación

Aunque la edición se declara de dominio público, BibliaAPP debe mostrar como mínimo:

```text
Santa Biblia — Reina Valera 1909
Reina Valera 1909
Traducción de Reina y Valera
Dominio público
Fuente: eBible.org, spaRV1909
```

La presentación debe conservar la ortografía histórica. Cualquier corrección tipográfica propia deberá documentarse como cambio y no aplicarse silenciosamente.

## Pendientes

- [ ] Descargar nuevamente el ZIP oficial al iniciar el trabajo.
- [ ] Archivar ZIP, URL, fecha y SHA-256.
- [ ] Guardar fuente y declaración de dominio público en la base de datos.
- [ ] Crear un importador que no ejecute el SQL del proveedor.
- [ ] Validar 66 libros, 1,189 capítulos y 31,084 registros.
- [ ] Comparar muestras de Génesis, Salmos, Evangelios, Romanos y Apocalipsis.
- [ ] Probar búsqueda, notas, favoritos, subrayados, compartir y voz.
- [ ] Mostrar información de fuente y dominio público en móvil y web.
- [ ] Mantener RVR1909 oculta hasta aprobar el reporte de importación.
- [ ] Confirmar que ningún texto o etiqueta diga RVR1960.

RVR1909 podrá activarse cuando el archivo y su hash estén archivados, la importación sea reproducible, la información de fuente sea visible y las pruebas confirmen que el contenido almacenado coincide con el original.
