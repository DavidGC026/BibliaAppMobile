# Integraciones de estudio en móvil

## Alcance y estado

Trabajo iniciado el 4 de septiembre de 2026 en `feat/integraciones-estudio-mobile`.
Destino de los commits: remoto **gitea** (`BibliaAPP_Mobile`). Se realizan pushes
normales; no se reescribe el historial.

**Implementación terminada.** Validaciones automáticas y revisión visual realizadas;
el alcance de la verificación nativa se detalla abajo.

| Bloque | Estado |
| --- | --- |
| API y almacenamiento local por capítulo | Implementado |
| Interlineal griego, hebreo y arameo; fichas Strong | Implementado y revisado |
| Comentarios por capítulo y rango de versículos | Implementado y revisado |
| Descargas por libro, progreso, reanudación y eliminación | Implementado y revisado |
| Atribuciones, comprobaciones y revisión visual | Realizadas |

## Punto de partida verificado

El servidor responde correctamente para Génesis 1:1, Juan 1:1, el título del
Salmo 23 y el Salmo 119. La API y la BD confirman cobertura de 66 libros, 141.746 palabras
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

## Cómo usarlo

1. Abrir un capítulo en el lector y pulsar **Interlineal** o **Comentarios**.
2. Si se selecciona antes un versículo, el estudio se abre filtrado a ese versículo.
   **Todo el capítulo** amplía la consulta e incluye los títulos de Salmos.
3. En Interlineal, tocar una palabra abre su ficha. **Volver** regresa a la lista.
   Auto/Hebreo/Griego se conserva entre aperturas del lector.
4. En **Perfil → Descargas → Estudio por libro**, elegir versión y libro.
   **Completar libro** conserva capítulos ya guardados; **Actualizar** consulta
   todo el libro de nuevo. La cola continúa mientras la app siga abierta.
5. Si la app se cierra durante una descarga, la tarea pendiente se recupera al
   abrirla. Ante un error de red, pulsar **Reintentar** cuando vuelva la conexión.

## Validación realizada

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Correcto tras los ajustes finales |
| `npm run check` | Correcto: comprobaciones previas y nuevas de estudio |
| `npm run check:study` | SQLite temporal: lectura offline, títulos, versiones, rangos, disco lleno, respuestas inválidas, interrupción y reanudación |
| `npx expo export --platform android --output-dir /tmp/biblia-mobile-integraciones-android` | Correcto: 2.069 módulos, bundle Hermes de 6,5 MB |
| API real | Cobertura y pasajes de griego/hebreo/títulos; Génesis 1:1 volvió a responder HTTP 200 al cierre |
| Revisión visual | 375×812 y 812×375, temas claro/oscuro, texto ampliado, ficha G3056, títulos, filtro de idioma, comentarios y ausencia de contenido |
| Accesibilidad de la vista web de prueba | Axe: cero infracciones en interlineal claro y comentarios oscuros después de nombrar el diálogo |

La revisión visual utilizó los componentes reales con React Native Web en un
entorno temporal: contenido extraído de la BD y almacenamiento/cola simulados
para controlar los estados. Las pruebas de persistencia y reanudación usan
por separado el código real del repositorio y SQLite temporal. Se comprobó que
no hay desbordamiento horizontal a 375 px y que los botones visibles superan
44 px, también con el texto ampliado al 160 % en la vista de prueba.

**Límite de verificación:** el emulador disponible figuraba `offline` en ADB.
La exportación Android valida el bundle, pero no sustituye una prueba instalada.
Queda comprobar en Android/iOS los lectores de pantalla, el tamaño de fuente del
sistema, la representación nativa de diacríticos y el reinicio real durante una
descarga. No se generó un APK ni un IPA en esta tarea.

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
- 2026-09-04: Perfil → Descargas permite elegir versión y libro, completar una
  copia parcial, actualizar o eliminarla. Presenta los capítulos guardados y la
  cantidad real de palabras/comentarios; los capítulos sin comentarios no se
  cuentan como comentarios disponibles. También se ven tareas de otros libros.
  Se evita recargar todo el catálogo en cada avance de una tarea posterior.
- 2026-09-04: revisión visual y cierre. La ficha Strong pasa a ocupar la vista
  inmediatamente al tocar una palabra: en versículos largos quedaba demasiado
  abajo. Volver mantiene montada la lista para conservar su posición. Se nombra
  el diálogo para accesibilidad y una respuesta vacía indica «Última consulta
  guardada», sin anunciar contenido disponible. TypeScript y exportación Android
  repetidos después de estos ajustes; ambos correctos.
