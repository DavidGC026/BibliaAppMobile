# Cómo ampliar los juegos bíblicos

Los tres juegos están disponibles en web (`/?section=games`) y en móvil
(**Inicio → Acciones rápidas** o **Perfil → Juegos bíblicos**). Esta guía explica
cómo agregar contenido y dónde cambiar las reglas existentes.

## Archivos que se editan

La fuente común está en el repositorio web, en `lib/games/`:

| Archivo | Contenido |
| --- | --- |
| `content.ts` | Palabras y pistas de Wordle, parejas de memoria, referencias para completar versículos y textos del catálogo de juegos. |
| `engine.ts` | Selección aleatoria, corrección de respuestas, generación de opciones y puntuaciones. |
| `hooks.ts` | Estado de cada partida, intentos, pistas y cierre automático de tarjetas. |
| `progress.ts` | Formato del historial y acumulación de resultados. |
| `__check__.ts` | Verificaciones de reglas y contenido. |

Móvil es un repositorio independiente. Conserva una copia en `mobile/lib/games/`
para compilar sin importar React desde el repositorio web. Edita primero la fuente
web y ejecuta la sincronización al terminar; los cambios hechos directamente en
la copia móvil se sobrescriben. Esta guía también se copia a `mobile/docs/`.

Las pantallas tienen implementaciones separadas:

| Juego | Web | Móvil |
| --- | --- | --- |
| Completa el versículo | `components/games/complete-verse.tsx` | `mobile/components/games/CompleteVerse.tsx` |
| Memoria | `components/games/memory-game.tsx` | `mobile/components/games/MemoryGame.tsx` |
| Wordle | `components/games/word-game.tsx` | `mobile/components/games/WordGame.tsx` |

## Agregar palabras al Wordle

Añade una entrada a `WORD_PUZZLES` en `lib/games/content.ts`. Actualmente hay
50 palabras; no existe un límite de 50 y puedes seguir agregando entradas.
Este ejemplo es una palabra adicional que aún no forma parte del catálogo:

```ts
{
  word: "ABRAHAM",
  clue: "Dios cambió su nombre y le prometió que sería padre de muchas naciones.",
  category: "Personaje",
  bookId: 1,
  chapter: 17,
  verse: 5,
  reference: "Génesis 17:5",
},
```

- Usa una sola palabra de **4 a 7 letras**, sin espacios, números ni guiones.
  El tablero adapta su cantidad de casillas a la palabra elegida.
- Puedes conservar las tildes en `word`: se muestran en el resultado, pero se
  ignoran al corregir. La **Ñ sí es distinta de N**.
- No repitas palabras aunque cambien las tildes o las mayúsculas.
- Escribe una pista clara y propia que permita deducir esa palabra.
- Las categorías actuales son `Personaje`, `Lugar`, `Objeto` y `Alimento`.
  Para agregar otra, amplía la unión `category` de `WordPuzzle` en el mismo archivo.
- Comprueba que el pasaje respalde la pista. `bookId`, `chapter` y `verse`
  determinan dónde abre el lector; `reference` es el texto visible y puede mostrar
  un rango. El lector abre un versículo de ese rango, no todos a la vez.

La elección es aleatoria en cada partida y puede repetirse en partidas futuras.
Agregar una palabra no requiere cambiar las pantallas ni la base de datos.
Para permitir palabras más largas, revisa primero el tablero en ambas pantallas
con un teléfono pequeño y actualiza la validación de longitud de `__check__.ts`.

## Agregar parejas de memoria

Añade una entrada a `MEMORY_PAIRS` en `lib/games/content.ts`:

```ts
{
  id: "gedeon",
  left: "Gedeón",
  right: "Venció a Madián con trescientos hombres",
  bookId: 7,
  chapter: 7,
  verse: 7,
  reference: "Jueces 7:7",
},
```

Usa un `id` estable y único, preferiblemente en minúsculas y sin espacios.
Evita repetir personajes o historias con el mismo texto: cada tarjeta debe tener
una pareja inequívoca. Mantén `right` breve para que se lea bien en el teléfono.

Cada partida elige al azar 4, 6 u 8 pares del catálogo. Añadir parejas aumenta la
variedad sin aumentar el tamaño del tablero. Los errores se cierran después de
1,5 segundos; durante ese intervalo no se puede voltear una tercera tarjeta.
Los aciertos permanecen visibles. Reiniciar o salir cancela el cierre pendiente.

## Agregar versículos y opciones de respuesta

Añade una referencia a `COMPLETION_PASSAGES` en `lib/games/content.ts`:

```ts
[19, 34, 8], // Salmos 34:8: [bookId, capítulo, versículo]
```

No copies el texto bíblico a este archivo. La API
`app/api/games/verses/route.ts` consulta esas referencias en la versión autorizada
que eligió la persona. Así cada traducción conserva su propio texto y permisos.
Si un pasaje no existe en esa versión, no aparece entre los candidatos.

La partida selecciona cinco pasajes disponibles. En cada uno se oculta una
palabra de al menos cuatro letras y se generan **cuatro opciones**: la respuesta
correcta y tres alternativas obtenidas del vocabulario de los pasajes cargados.
No hay una lista de respuestas incorrectas que debas mantener a mano. El modo de
respuesta escrita usa los mismos pasajes y la misma palabra oculta.

Para evitar que una palabra demasiado genérica se use como respuesta, agrégala
normalizada a `SKIP_WORDS` en `engine.ts`. Para cambiar cómo se construyen las
opciones, modifica `candidateWords` o `createVerseQuestions` y comprueba que haya
una sola respuesta correcta y que no se repitan opciones al ignorar tildes.

Los identificadores de libros son los del catálogo de la app; por ejemplo,
Génesis = 1, Éxodo = 2, Salmos = 19, Mateo = 40 y Juan = 43.
Puedes consultar el catálogo real con una consulta de solo lectura:

```sql
SELECT idBook, name FROM bible_books ORDER BY idBook;
```

## Cambiar las opciones de juego

| Opción | Dónde cambiarla | Qué revisar |
| --- | --- | --- |
| Tiempo para cerrar errores de memoria | `MEMORY_MISMATCH_DELAY_MS` en `hooks.ts` (1500 ms). | Que permita leer las tarjetas y que el cierre se cancele al salir o reiniciar. |
| Tamaños del tablero | `[4, 6, 8]` en las dos pantallas de memoria y límites de `createMemoryGame` en `engine.ts`. | Columnas, cantidad suficiente de parejas y textos del catálogo. |
| Cantidad de versículos por ronda | Parámetro `count` de `createVerseQuestions` en `engine.ts` (5). | Tener suficientes pasajes elegibles y actualizar los textos que anuncian cinco preguntas. |
| Cantidad de opciones por versículo | Selección de alternativas de `createVerseQuestions` (tres alternativas más la respuesta). | Vocabulario mínimo, pruebas y distribución de botones en ambas pantallas. |
| Intentos de Wordle | Límite de `useWordGame` en `hooks.ts` y filas/textos en ambas pantallas (6). | Validación de fin de partida y puntuación. |
| Puntos de memoria y Wordle | `memoryScore` y `wordScore` en `engine.ts`. | El costo mostrado de revelar letras (15 puntos) y las pruebas de puntuación. |
| Puntos de completar versículos | Cálculo de `score` en `useVerseGame`, `hooks.ts`. | Porcentaje de aciertos y presentación del resultado. |
| Títulos y descripciones | `GAME_CATALOG` en `content.ts`. | Nombres consistentes en las pantallas y en las instrucciones. |

Si agregas un juego completamente nuevo, también hay que registrar su `GameId`,
inicializar y validar su historial en `progress.ts`, crear las dos pantallas y
conectarlas en `components/games/index.tsx` y `mobile/app/games.tsx`.
Un cambio al formato del historial necesita compatibilidad o migración de los
datos guardados; agregar palabras o parejas no cambia ese formato.

## Sincronizar y verificar

Con ambos repositorios en esta disposición:

```text
BibliaAPP/              ← repositorio web
  lib/games/
  docs/juegos-biblicos.md
  mobile/              ← repositorio móvil
    lib/games/
    docs/juegos-biblicos.md
```

Desde la raíz web:

```bash
npm run check:games
npm --prefix mobile run sync:games
node mobile/scripts/sync_games.cjs --check
npm --prefix mobile run check:games
```

El script copia contenido, reglas, hooks, historial, pruebas y esta guía.
Las pruebas se llaman `__check__.cts` en móvil para excluirlas del programa
TypeScript de la app. Si solo tienes el repositorio móvil, sus pruebas se pueden
ejecutar de forma independiente; para sincronizar necesitas también el web como
carpeta padre.

Las verificaciones detectan palabras repetidas, longitud no admitida, pistas
vacías, referencias numéricas inválidas, parejas duplicadas y regresiones en la
corrección y las puntuaciones. No verifican por sí solas la exactitud de una pista
bíblica: léela junto con su pasaje. El mínimo de 50 palabras protege el catálogo
actual, pero permite ampliarlo sin modificar la prueba.

Antes de publicar, prueba una palabra nueva, abre su referencia y comprueba un
error y un acierto en memoria. Para cambios de reglas ejecuta también `npm run
check` y la comprobación TypeScript en ambos repositorios. Las palabras y parejas
se incluyen en los paquetes de cliente: reconstruye y despliega la web, y genera
una nueva versión de la app para que lleguen a los dispositivos instalados.
Registra y sube los cambios en los dos repositorios.

Los resultados se guardan por cuenta y dispositivo (`localStorage` en web,
SQLite en móvil). Esta ampliación no requiere tablas nuevas ni sincroniza puntos
entre dispositivos.
