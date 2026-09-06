# Cómo usar y ampliar los juegos bíblicos

Los juegos se abren en web desde **Juegos** (`/?section=games`) y en móvil desde
**Inicio → Acciones rápidas** o **Perfil → Juegos bíblicos**. Están disponibles
para visitantes y personas con cuenta.

La [bitácora de cambios](juegos-cambios.md) explica las decisiones de esta ampliación
y registra sus pruebas y entrega.

## Formas de jugar

### Jugar libre

- **Completa el versículo:** cinco preguntas con cuatro opciones o respuesta escrita.
- **Memoria bíblica:** tableros de 4, 6 u 8 pares. Las tarjetas incorrectas se cierran
  después de 1,5 segundos; los aciertos permanecen visibles.
- **Wordle bíblico:** seis intentos y letras reveladas a cambio de 15 puntos.
  Filtra por 4, 5, 6 o 7 letras y por categoría. Cada combinación recorre sus
  palabras antes de comenzar otro ciclo; si no tiene palabras, cambia los filtros.
- **Ordena el versículo:** reconstruye tres pasajes tocando las palabras. Toca una
  palabra colocada para retirarla. Conserva las mayúsculas y los signos de puntuación.
  Las fichas con el mismo texto son intercambiables. Mostrar la respuesta registra
  ese pasaje como un error para repasar.

En **Personalizar práctica** puedes elegir los filtros de Wordle y la dificultad
de completar y ordenar. Las preferencias se conservan en cada dispositivo.

Wordle incluye 50 palabras iniciales. Se registra una palabra cuando empieza la
partida libre, aunque se abandone. Al iniciar otro ciclo se evita repetir
inmediatamente la última palabra. Si se amplía el catálogo, las palabras nuevas
entran en el ciclo actual. Los retos diarios y repasos no consumen ese ciclo.

### Reto diario

Cada fecha tiene un Wordle, seis parejas de memoria y cinco referencias bíblicas;
completar usa cinco pasajes y ordenar selecciona hasta tres pasajes adecuados.
La fecha cambia a medianoche de **Ciudad de México**. Web y móvil reciben la misma
selección y utilizan las mismas reglas para distribuir las fichas y las opciones.
Las referencias coinciden entre traducciones; el texto respeta la versión elegida.

La selección queda guardada cuando se solicita por primera vez ese día. Si un
administrador publica contenido después, el reto ya creado no cambia.

El primer resultado de cada juego y fecha suma puntos. Se puede repetir para
practicar sin volver a sumar puntos diarios. Con una cuenta se conserva el primer
resultado recibido por el servidor entre web y móvil. Sin conexión, el total local
puede ajustarse al sincronizar si ya había un resultado para ese día. Los visitantes
conservan sus resultados en el dispositivo. No hay una clasificación competitiva.

### Repasar mis errores

La lista recoge los Wordle que no se resuelven y los errores de completar u ordenar
versículos. Un error queda disponible para practicar hoy. Tras acertar se programa
el próximo repaso para 1, 3 y 7 días después; el cuarto acierto retira la entrada.
Repetir aciertos el mismo día no adelanta la secuencia. Un nuevo error la reinicia.

Se conservan hasta 200 entradas y solo referencias de los pasajes, junto con la
versión bíblica utilizada. Si esa versión deja de estar disponible para la cuenta,
el repaso no permite eludir sus permisos. Las palabras conservan la pista y la
referencia que tenían cuando se registró el error.

### Continuar una partida

Al volver a juegos aparece **Continúa donde te quedaste**. Pulsa **Continuar**
para recuperar las respuestas, intentos, pistas, texto escrito y fichas; también
se conservan la versión bíblica, el nivel y el tamaño del tablero. **Descartar**
retira ese guardado, y **Reiniciar** empieza una partida nueva.

Se guardan hasta doce partidas, durante siete días desde el último cambio.
Memoria cierra las parejas incorrectas al recuperarlas. Completar y ordenar vuelven
a consultar los mismos pasajes con conexión y con los permisos de la cuenta.
Las partidas finalizadas se retiran de la lista. En dos dispositivos jugando la
misma partida, prevalece el guardado más reciente; una partida ya abierta conserva
su pantalla hasta salir y continuar de nuevo. Un resultado se cuenta una sola vez.

### Dificultad gradual

Los niveles **Inicial**, **Intermedia** y **Avanzada** seleccionan pasajes cortos,
medios y largos del banco disponible en la traducción elegida. Se trata de longitud
y práctica, no de una clasificación teológica de los pasajes.

**Automática** se ajusta por separado para completar y ordenar:

- Las primeras tres partidas usan el nivel inicial.
- Con al menos tres partidas y un promedio de 60/100 en las tres últimas,
  se pasa al nivel intermedio.
- Con al menos seis partidas y un promedio de 80/100 en las tres últimas,
  se pasa al avanzado.
- Si el promedio baja, la siguiente partida puede usar un nivel más sencillo.

Puedes escoger un nivel manual. El reto diario mantiene sus reglas comunes y los
repasos se centran en el pasaje fallado, sin aplicar los filtros de partidas libres.

### Mi semana

Muestra los últimos siete días según la fecha de Ciudad de México: partidas,
puntos, respuestas correctas, repasos completados, palabras o referencias que
recordaste y temas pendientes de refuerzo. Cada día cuenta partidas y avances
de repaso como actividades. Un repaso terminado puede aportar ambas actividades.

El detalle empieza con la versión 4.4.0; los puntos antiguos permanecen en los
totales, sin asignarles fechas inventadas. Se conservan hasta 6000 registros de los
últimos 56 días. La dificultad automática usa los resultados disponibles en ese
historial. Un nuevo error reinicia un repaso; un error antiguo que llega tarde
desde otro dispositivo no deshace un avance más reciente.

## Administrar contenido desde la app

Con una cuenta de administrador, entra en **Juegos → Administrar contenido**.
El editor está disponible en web y móvil. La API verifica también el rol actual
en el servidor; ocultar el botón no es el único control de acceso.

1. Elige **Palabras de Wordle**, **Parejas de memoria** o **Versículos**.
2. Completa el formulario, o busca una entrada del catálogo y pulsa **Editar**.
3. Elige el libro, capítulo y versículo que respaldan la respuesta.
4. Pulsa **Vista previa** y revisa la palabra, pista o pareja y su referencia.
5. Pulsa **Publicar contenido**.

La publicación actualiza el catálogo central. En los dispositivos, usa **Actualizar
contenido** o vuelve a abrir los juegos para obtenerlo. Las entradas nuevas llegan
a las versiones de la app que incluyen este editor sin recompilar ni reinstalar
el APK. Un cambio de reglas o de pantallas sí requiere una nueva versión.

Si otra persona publicó mientras editabas, la app muestra un conflicto y conserva
el formulario. Recarga el catálogo, vuelve a seleccionar la entrada si estabas
editando y revisa la vista previa antes de publicar otra vez. Así no se sobrescriben
silenciosamente los cambios del otro administrador.

### Palabras y pistas

Usa una sola palabra de **4 a 7 letras**, sin espacios, números ni guiones. Puedes
conservar las tildes; se ignoran al corregir. La **Ñ sí es distinta de N**. No se
admiten duplicados aunque cambien las mayúsculas o las tildes.

Ejemplo de nueva palabra: **ABRAHAM**, categoría **Personaje**, pista «Dios cambió
su nombre y le prometió que sería padre de muchas naciones», referencia
**Génesis 17:5**. Comprueba siempre que la pista tenga una respuesta clara y que
el pasaje la respalde. El servidor comprueba que el pasaje exista, pero no puede
validar por sí solo el significado de la pista.

La referencia visible es opcional. Si la dejas vacía, se genera a partir del libro,
capítulo y versículo elegidos. Puedes escribir un rango como `Génesis 17:5-8`;
el lector abrirá el versículo elegido en el formulario.

### Parejas de memoria

Escribe un personaje y una historia breve que lo identifique sin ambigüedad.
Por ejemplo, **Gedeón** y **Venció a Madián con trescientos hombres**, con referencia
**Jueces 7:7**. No se admiten personajes, historias o identificadores duplicados.
El identificador se genera automáticamente al crear la pareja y se conserva al editarla.

Agregar parejas aumenta la variedad, sin cambiar el tamaño de los tableros.

### Pasajes para completar y ordenar

Elige solo el libro, capítulo y versículo; no pegues el texto de una traducción.
Por ejemplo, **Salmos 34:8**. La app lo obtiene de la Biblia autorizada que elija
la persona al jugar. Un pasaje que no exista en esa traducción no participa.

Las cuatro opciones para completar un versículo se generan automáticamente con
el vocabulario de los pasajes cargados: una respuesta correcta y tres alternativas.
No necesitas mantener una lista de respuestas incorrectas. Ordenar usa pasajes de
3 a 40 palabras para que el tablero resulte manejable en el teléfono. Incluye
pasajes de distinta longitud: los niveles los agrupan automáticamente. Al ampliar
Wordle, la longitud y la categoría de cada palabra determinan en qué filtros aparece.

## Datos, conexión e historial

El servidor guarda el catálogo publicado en `bible_game_content`, con un número
de revisión y el administrador que hizo la última publicación. Guarda la selección
diaria en `bible_game_daily`. Las tablas se crean e inicializan automáticamente al
acceder a la API. No se sobrescribe un catálogo existente al desplegar código.

Memoria y Wordle funcionan con el catálogo guardado o el incluido en la app.
Completar y ordenar necesitan conexión para consultar el texto bíblico. El reto
actual puede usar una selección previamente guardada; un reto de otra fecha
requiere actualizar el contenido. Un fallo de conexión no borra el catálogo guardado.

El formato v3 conserva los puntos, ciclos de Wordle, repasos, partidas y actividad
por cuenta, con una copia en `localStorage` en web y SQLite en móvil. Importa una
vez el historial local v2, o v1 si no existe v2; mantiene intactas las claves antiguas.
Cada instalación aporta sus totales anteriores, combinando los resultados diarios
conocidos sin volver a sumarlos. Los datos de visitante no pasan a otra cuenta.

`POST /api/games/progress` requiere una sesión válida y la cuenta esperada. MySQL
guarda el estado en `bible_game_progress` y recibos de operaciones en
`bible_game_operations`; una transacción por usuario combina los avances.
Los recibos evitan duplicados aunque se pierda una respuesta y el cliente reintente.
Las tablas se crean al primer acceso; deben incluirse en la copia de seguridad.

El cliente guarda primero los cambios pendientes y los envía al terminar de editar,
al volver a la app y periódicamente. **Sincronizar ahora** permite solicitarlo.
Los cambios hechos mientras llega una respuesta se conservan y vuelven a aplicarse.
Si falla la red, puedes continuar y enviar lo pendiente más tarde. Si falla el
almacenamiento, aparece un aviso; no se reemplaza un historial ilegible ni se envía
una importación que todavía no tenga identidad guardada. Evita borrar los datos
de la app mientras haya cambios pendientes.

Los ciclos se comparten cuando hay conexión. Dos dispositivos jugando sin haber
sincronizado pueden elegir la misma palabra; al reconectar se combinan sus avances.
No se almacenan traducciones completas en el progreso, solo referencias y respuestas.

## Archivos para desarrolladores

La fuente de las reglas compartidas está en el repositorio web, en `lib/games/`:

| Archivo | Responsabilidad |
| --- | --- |
| `content.ts` | Catálogo inicial: 50 palabras, 20 parejas y 30 referencias; títulos de los cuatro juegos. |
| `catalog.ts` | Validación, selección sin repeticiones, fecha de Ciudad de México y semillas. |
| `engine.ts` | Generación de preguntas, corrección de letras, memoria, orden y puntuaciones. |
| `hooks.ts` | Estado de las partidas, registro de errores y cierre automático de tarjetas. |
| `session.ts` | Catálogo, opciones, ciclos y coordinación de partidas y resúmenes. |
| `persistence.ts` | Diario local v3, importación y cola de sincronización. |
| `sync.ts` | Validación y combinación de operaciones por cuenta. |
| `saved-round.ts` | Guardados, límites y validación de las partidas recuperables. |
| `training.ts` | Filtros, ciclos, niveles y cálculo de la semana. |
| `progress.ts` | Puntuaciones y resultados diarios. |
| `review.ts` | Entradas e intervalos de repaso. |
| `round.ts` | Opciones comunes y consulta de pasajes por modalidad. |
| `editor.ts` | Formularios, vista previa y publicación. |
| `__check__.ts` | Pruebas de las reglas y del contenido. |

`lib/game-content-store.ts`, `lib/game-progress-store.ts` y `app/api/games/` implementan la persistencia y las
consultas del servidor. `app/api/admin/games/content/route.ts` protege la edición.

Las pantallas web están en `components/games/`; las nativas, en
`mobile/components/games/`. La entrada móvil es `mobile/app/games.tsx`.

Editar `content.ts` cambia los valores iniciales y el respaldo incluido en futuras
compilaciones. Para modificar el catálogo de una instalación ya inicializada,
publica con el editor. Una edición del archivo no reemplaza los datos publicados.

## Cambiar opciones y reglas

| Opción | Dónde cambiarla | Qué comprobar |
| --- | --- | --- |
| Cierre automático de memoria | `MEMORY_MISMATCH_DELAY_MS` en `hooks.ts` (1500 ms). | Bloqueo de la tercera tarjeta, aciertos y cancelación al reiniciar. |
| Tableros de memoria | Selectores en las dos pantallas y límites de `createMemoryGame`. | Catálogo suficiente, columnas y reto diario. |
| Intentos y pistas de Wordle | `useWordGame`, `wordScore` y ambas pantallas. | Fin de partida, costo mostrado y puntuación. |
| Longitud y categorías | `parseWord`, `WORD_CATEGORIES`, `parseFilters` y las dos pantallas. | Catálogo, filtros vacíos y legibilidad con teléfonos pequeños. |
| Dificultad gradual | `automaticLevel` y `selectLevelVerses` en `training.ts`. | Umbrales, banco pequeño y reglas del reto diario. |
| Guardados | `ROUND_LIFETIME_MS`, `parseCheckpoint` y límites en `sync.ts`. | Recuperación, descartes y cambios de catálogo. |
| Resumen semanal | `weeklySummary` y retención de actividad en `sync.ts`. | Fechas de México, repasos y datos antiguos sin fecha. |
| Preguntas y alternativas | `createVerseQuestions`, `SKIP_WORDS` y los textos de preparación. | Una única opción correcta, vocabulario suficiente y modalidad diaria. |
| Longitud de pasajes para ordenar | `createOrderQuestions` (3 a 40 palabras). | Puntuación, palabras repetidas y disposición de las fichas. |
| Intervalos de repaso | `updateReview` en `review.ts`. | Cambio de fecha, repetición en el mismo día y migración si cambia el formato. |

Un juego nuevo requiere agregar su `GameId`, registrar sus puntuaciones, crear las
dos pantallas y conectarlas a las entradas web y móvil. Los cambios de historial
deben conservar los datos anteriores o migrarlos explícitamente.

## Sincronizar, probar y publicar

Móvil tiene su propio repositorio, ubicado en `mobile/` dentro del web. Desde la raíz:

```bash
npm run check:games
npm --prefix mobile run sync:games
node mobile/scripts/sync_games.cjs --check
npm --prefix mobile run check:games
```

La sincronización copia reglas, contenido, hooks, pruebas y documentación. Edita
primero la fuente web; los cambios directos en `mobile/lib/games/` se sobrescriben.
Las pruebas móviles se llaman `__check__.cts` para excluirlas del programa TypeScript
de la app. Se pueden ejecutar sin tener el repositorio web como carpeta padre.

Para comprobar la API usa `scripts/check_games_api.ts` con las variables de conexión
cargadas. Crea una base temporal, copia únicamente el catálogo bíblico necesario,
utiliza usuarios de prueba y la elimina al terminar. Requiere permiso de creación
de bases; se pueden proporcionar `GAMES_TEST_ADMIN_USER` y
`GAMES_TEST_ADMIN_PASSWORD` mediante el entorno cuando la cuenta de la app no
lo tiene. No pongas contraseñas en el código ni en los comandos versionados.

```bash
npm run check:games-api
```

La opción `--keep` conserva la base y escribe un archivo privado en `/tmp` para
revisar la interfaz con usuarios ficticios; añade esquemas auxiliares vacíos,
sin copiar datos personales. Al terminar esa revisión, detén la vista previa,
revoca el permiso de la base temporal, elimínala y borra su archivo de credenciales.

Antes de publicar reglas nuevas ejecuta también `npm run check`, la comprobación
TypeScript de ambos clientes y una prueba de las pantallas. Reconstruye la web y
la app, verifica la firma del APK y registra los cambios en los dos repositorios.
