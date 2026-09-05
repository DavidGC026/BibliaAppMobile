# Integraciones de estudio en móvil

## Alcance y estado

Trabajo iniciado el 4 de septiembre de 2026 en `feat/integraciones-estudio-mobile`.
Destino de los commits: remoto **gitea** (`BibliaAPP_Mobile`). Se realizan pushes
normales; no se reescribe el historial.

| Bloque | Estado |
| --- | --- |
| API y almacenamiento local por capítulo | Implementado |
| Interlineal griego, hebreo y arameo; fichas Strong | Implementado; revisión visual al cierre |
| Comentarios por capítulo y rango de versículos | Implementado; revisión visual al cierre |
| Descargas por libro, progreso, reanudación y eliminación | En curso: motor y cola preparados |
| Atribuciones, comprobaciones y revisión visual | Pendiente |

## Punto de partida verificado

El servidor responde correctamente para Génesis 1:1, Juan 1:1, el título del
Salmo 23 y el Salmo 119. Su API informa cobertura de 66 libros, 141.746 palabras
griegas, 305.638 hebreas/arameas, 49 partículas y 14.197 entradas Strong con
definiciones españolas.

Hay 127 comentarios de Charles Spurgeon sobre Salmos, traducidos al español,
con un bloque por capítulo. Los otros 23 salmos siguen sin contenido publicado
en el servidor; la integración móvil debe mostrar esa ausencia con claridad.

El AT tiene glosa inglesa y definición Strong española. No se presentará esa
glosa como una traducción española. El original se consulta en su propia vista;
las palabras de las versiones españolas conservan su selección habitual.

## Decisiones

- Reutilizar las API existentes; no hace falta modificar ni desplegar el backend.
- Cargar un capítulo al abrir el estudio, con copia local para consultas posteriores.
- Descargar por libro a petición del usuario. Cada capítulo se guarda de forma
  atómica para poder reanudar una descarga interrumpida sin perder lo terminado.
- Mantener los interlineales independientes de la versión española. Los comentarios
  se separan por versión para respetar los filtros del servidor.
- Guardar esta bitácora dentro del repositorio móvil: `../docs-mobile` está fuera
  de él y no viaja con sus commits.
- No incorporar léxicos aplazados ni fuentes excluidas del plan del backend.

## Validación prevista

- TypeScript y comprobaciones existentes del móvil.
- Pruebas de referencias, títulos v.0, separación por versión y almacenamiento
  completo de capítulos; lectura sin red y reanudación tras fallos.
- Respuestas reales del servidor y exportación del bundle de Android.
- Revisión de estados de carga, errores, ausencia de datos, RTL y temas del lector.

## Referencias técnicas

Se consultó la documentación exacta exigida por `AGENTS.md` antes de escribir código:
[Expo 56](https://docs.expo.dev/versions/v56.0.0/),
[SQLite](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/) y
[Font](https://docs.expo.dev/versions/v56.0.0/sdk/font/).

## Bitácora

- 2026-09-04: revisión de API y datos reales, rama nueva y alcance registrado.
  Los cambios previos de `app.json`, `app/(tabs)/feed.tsx` y
  `components/ExternalLink.tsx` pertenecen al trabajo anterior.
- 2026-09-04: API tipada y copia SQLite por capítulo, con títulos v.0 y datos
  Strong incluidos. El catálogo local conserva `hasInterlinear`. El interlineal
  comparte copia entre versiones; los comentarios mantienen su versión. Las
  respuestas vacías se vuelven a consultar al estar en línea. Una escritura
  fallida conserva la copia anterior y permite seguir consultando en línea.
  Prueba `npm run check:study` sobre SQLite temporal y transportes simulados
  (requiere Python 3; compatible con Node 20, sin instalar dependencias).
- 2026-09-04: acceso Interlineal desde el lector, también en modo párrafos.
  Vista nativa por versículo con lista virtualizada, títulos de Salmos, orden RTL,
  transliteración, glosa, morfología y ficha Strong. Selector Auto/Hebreo/Griego
  persistente y filtro para el versículo seleccionado. Controles de 48 puntos,
  colores del tema del lector y cierre con el botón Atrás de Android. Se añade
  la atribución STEPBible en Información legal. TypeScript correcto.
- 2026-09-04: acceso Comentarios desde el lector, filtrado por autor y por rango
  exacto del versículo seleccionado. Spurgeon se lee como un bloque por salmo,
  sin inventar comentarios para los capítulos ausentes. El texto se presenta en
  párrafos nativos virtualizados con títulos, citas y énfasis; no ejecuta HTML ni
  necesita el editor de notas. Información legal identifica la obra y traducción.
- 2026-09-04: descargas de estudio incorporadas a la cola persistente existente.
  Se solicita y guarda un capítulo a la vez; una interrupción conserva los
  capítulos terminados. Reintentar completa los restantes; Actualizar vuelve a
  consultar el libro, incluidos capítulos vacíos. La prueba simula una caída en
  el segundo capítulo y verifica reanudación, progreso y lectura sin red.
