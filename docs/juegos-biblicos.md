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
  Recorre todas las palabras disponibles antes de comenzar otro ciclo.
- **Ordena el versículo:** reconstruye tres pasajes tocando las palabras. Toca una
  palabra colocada para retirarla. Conserva las mayúsculas y los signos de puntuación.
  Las fichas con el mismo texto son intercambiables. Mostrar la respuesta registra
  ese pasaje como un error para repasar.

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
practicar sin volver a sumar puntos diarios. Los resultados siguen siendo locales
por cuenta y dispositivo, por lo que jugar en otro dispositivo tiene su propio
historial; no hay una clasificación competitiva compartida.

### Repasar mis errores

La lista recoge los Wordle que no se resuelven y los errores de completar u ordenar
versículos. Un error queda disponible para practicar hoy. Tras acertar se programa
el próximo repaso para 1, 3 y 7 días después; el cuarto acierto retira la entrada.
Repetir aciertos el mismo día no adelanta la secuencia. Un nuevo error la reinicia.

Se conservan hasta 200 entradas y solo referencias de los pasajes, junto con la
versión bíblica utilizada. Si esa versión deja de estar disponible para la cuenta,
el repaso no permite eludir sus permisos. Las palabras conservan la pista y la
referencia que tenían cuando se registró el error.

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
3 a 40 palabras para que el tablero resulte manejable en el teléfono.

## Datos, conexión e historial

El servidor guarda el catálogo publicado en `bible_game_content`, con un número
de revisión y el administrador que hizo la última publicación. Guarda la selección
diaria en `bible_game_daily`. Las tablas se crean e inicializan automáticamente al
acceder a la API. No se sobrescribe un catálogo existente al desplegar código.

Memoria y Wordle funcionan con el catálogo guardado o el incluido en la app.
Completar y ordenar necesitan conexión para consultar el texto bíblico. El reto
actual puede usar una selección previamente guardada; un reto de otra fecha
requiere actualizar el contenido. Un fallo de conexión no borra el catálogo guardado.

Los puntos, palabras vistas y repasos se guardan en `localStorage` en web y SQLite
en móvil, por cuenta y dispositivo. El formato v2 importa automáticamente los
puntos del formato v1 cuando aún no existe un historial v2. La clave anterior
permanece intacta. No se sincroniza el progreso entre dispositivos.

## Archivos para desarrolladores

La fuente de las reglas compartidas está en el repositorio web, en `lib/games/`:

| Archivo | Responsabilidad |
| --- | --- |
| `content.ts` | Catálogo inicial: 50 palabras, 20 parejas y 30 referencias; títulos de los cuatro juegos. |
| `catalog.ts` | Validación, selección sin repeticiones, fecha de Ciudad de México y semillas. |
| `engine.ts` | Generación de preguntas, corrección de letras, memoria, orden y puntuaciones. |
| `hooks.ts` | Estado de las partidas, registro de errores y cierre automático de tarjetas. |
| `session.ts` | Carga, caché, migración del historial y coordinación de las partidas. |
| `progress.ts` | Puntuaciones y resultados diarios. |
| `review.ts` | Entradas e intervalos de repaso. |
| `round.ts` | Opciones comunes y consulta de pasajes por modalidad. |
| `editor.ts` | Formularios, vista previa y publicación. |
| `__check__.ts` | Pruebas de las reglas y del contenido. |

`lib/game-content-store.ts` y `app/api/games/` implementan la persistencia y las
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
| Longitud de palabras | `parseWord`, las pruebas y los dos tableros. | Legibilidad con teléfonos pequeños. |
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

Antes de publicar reglas nuevas ejecuta también `npm run check`, la comprobación
TypeScript de ambos clientes y una prueba de las pantallas. Reconstruye la web y
la app, verifica la firma del APK y registra los cambios en los dos repositorios.
