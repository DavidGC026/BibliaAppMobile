# Evolución de los juegos bíblicos

## Versión 4.4.0 · 6 de septiembre de 2026

Se incorporan progreso compartido por cuenta, partidas recuperables, filtros de
Wordle, dificultad gradual y un resumen de los últimos siete días en ambos clientes.

- **Sincronización.** La API combina operaciones identificadas, dentro de una
  transacción por usuario. Los recibos de operaciones evitan sumar otra vez una
  partida cuando se reintenta una solicitud. El cliente conserva los cambios
  pendientes y vuelve a aplicarlos si llegaron mientras esperaba la respuesta.
  También comprueba la cuenta esperada para que un cambio de sesión no mezcle datos.
- **Migración.** Cada instalación importa una vez sus totales anteriores. Los
  resultados diarios con fecha se separan y combinan por juego y día. Las claves
  v1 y v2 siguen conservadas; los visitantes mantienen un historial local independiente.
- **Partidas.** Se conservan hasta doce partidas durante siete días. El guardado
  incluye intentos, pistas, fichas, respuestas y opciones. Para los versículos se
  guardan referencias y la versión elegida, y se vuelve a solicitar el texto con
  sus permisos. Un guardado atrasado no revive una partida terminada o descartada.
- **Filtros.** Cada combinación de longitud y categoría tiene su propio ciclo de
  palabras. Se comparten sus contadores cuando hay conexión. Dos equipos jugando
  simultáneamente sin sincronizar pueden elegir la misma palabra; al reconectar
  se combinan ambos avances. El reto diario y el repaso conservan su contenido.
- **Dificultad.** Las partidas libres de versículos pueden usar nivel inicial,
  intermedio, avanzado o automático. El automático comienza con pasajes cortos:
  después de tres partidas puede subir a intermedio, y después de seis a avanzado,
  según el promedio de las tres últimas. Puede volver a un nivel más sencillo.
- **Mi semana.** Muestra partidas, puntos, respuestas correctas, repasos completados,
  palabras o referencias recordadas y temas pendientes. No inventa fechas para los
  totales antiguos: el detalle comienza con esta versión. Se conservan hasta 6000
  registros de actividad de los últimos 56 días.

### Validación

- `npm run check` y TypeScript correctos en web y móvil; reglas y documentación
  compartidas verificadas con `sync_games.cjs --check`.
- API en una base temporal: aislamiento de cuentas, sesión eliminada, operaciones
  inválidas, solicitudes concurrentes, reintentos, puntos diarios únicos, guardados
  compartidos y referencias recuperadas con los permisos de la Biblia.
- Reglas: tres ciclos completos por combinación de filtros, migración de 49/50
  palabras, cambios en tránsito, importaciones, guardados atrasados, repasos,
  umbrales de dificultad y límites de fechas del resumen.
- Navegador: continuar los cuatro juegos tras recargar, conservar borrador,
  intentos, pista, fichas, pasaje y versión; Wordle sin coincidencias en los filtros;
  memoria cierra errores automáticamente y bloquea una tercera tarjeta.
- Dos navegadores independientes: comenzar y terminar la misma partida entre
  clientes; acumular un resultado sin red, recargar y sincronizar sin duplicarlo;
  historial de visitante separado del de la cuenta.
- Fallos de almacenamiento: no se sobrescribe un historial ilegible y una
  importación espera a tener su identidad guardada antes de enviarse.
- Interfaz a 375 px, opciones de práctica desplegables, retorno al inicio al
  cambiar de juego o vista, y comprobación de accesibilidad de las opciones.
- Next.js compilado para producción y exportación de Expo para iOS completada.
- APK Android 4.4.0, código 56, ARM64, paquete `com.bibliaapp.mobile`, compilado
  con la firma dvguzman. Firma y alineación verificadas; bundle del APK idéntico
  al generado por Gradle. Tamaño: 47 470 060 bytes.
- SHA-256 del APK:
  `e8f07c1755717d88baffd425499aa72b4b9becbb64ca96607304f168af137a8c`.

La validación móvil cubre reglas compartidas, tipos, exportación de iOS y
compilación Android firmada. No se instaló esta versión en un teléfono físico
durante esta entrega.

## Versión 4.3.0 · 5 de septiembre de 2026

Se incorporan cinco mejoras, con las mismas reglas en web y móvil:

- Wordle recorre el catálogo sin repetir palabras en las partidas libres.
- El reto diario fija una palabra, seis parejas y cinco referencias por fecha.
- Ordena el versículo permite construir tres pasajes tocando sus palabras.
- El repaso guarda los errores de Wordle, completar y ordenar versículos.
- El editor de administradores añade y corrige el contenido compartido.

### Decisiones registradas durante la implementación

**Catálogo publicado.** `bible_game_content` conserva el catálogo y una revisión.
La publicación comprueba duplicados, límites y existencia de referencias bíblicas.
La revisión evita que dos administradores sobrescriban el trabajo del otro.
Las Biblias y sus permisos siguen siendo responsabilidad del catálogo bíblico.

**Reto diario.** `bible_game_daily` guarda una selección inmutable por fecha de
Ciudad de México. Una publicación durante el día modifica las partidas libres;
el reto ya creado conserva su contenido. Web y móvil consultan la misma selección
y emplean semillas comunes para ordenar tarjetas y opciones. Las referencias son
iguales entre traducciones; las palabras concretas respetan cada traducción.

**Historial.** El formato pasa a la versión 2. Los nuevos clientes leen primero
su historial v2 y, si no existe, importan las puntuaciones v1. Conservan el archivo
o clave anterior. Se mantienen separados los datos por cuenta y dispositivo.
El historial guarda palabras vistas, resultados diarios y referencias de repaso;
no almacena textos de traducciones bíblicas en la lista de errores.

**Palabras sin repetir.** Una palabra queda registrada al comenzar la partida
libre, aunque se abandone. Al terminar el catálogo empieza otro ciclo y se evita
repetir inmediatamente la última palabra. Las entradas nuevas entran en el ciclo
actual; las eliminadas dejan de contar. Retos diarios y repasos no consumen el ciclo.

**Repaso.** Los Wordle perdidos y los errores de los juegos de versículos crean
un repaso para hoy. Cada acierto lo programa para 1, 3 y 7 días después. El cuarto
acierto retira la entrada. Repetir aciertos el mismo día no adelanta los intervalos.
Un error reinicia la secuencia. La lista conserva hasta 200 entradas.

**Puntos diarios.** Se conserva el primer resultado de cada juego y fecha.
Se puede repetir para practicar, pero no se vuelven a sumar puntos diarios.
Este control es local, igual que las puntuaciones existentes; no es una clasificación
competitiva ni sincroniza resultados entre dispositivos.

**Editor.** Los formularios muestran una vista previa antes de publicar. La API
verifica la sesión y el rol de administrador actual en la base de datos. Los campos
se validan de nuevo en el servidor. La operación publica una revisión completa;
no modifica un reto diario que ya exista.

### Validación y entrega

- `npm run check` y TypeScript sin errores en web y móvil; reglas compartidas
  sincronizadas. Compilación de producción de Next.js correcta.
- Exportaciones de Expo para Android e iOS completadas. APK Android 4.3.0,
  código 55, ARM64, paquete `com.bibliaapp.mobile`, sin regenerar su identidad nativa.
- Firma release de dvguzman verificada con `apksigner`, alineación correcta y
  bundle del APK comparado con el recién compilado. Tamaño: 47 425 824 bytes.
- SHA-256 del APK:
  `b49396cab226dc676ac52f741e54c1f075416af442c079d5a40d4a76e7256e1a`.
- API probada con usuarios ficticios y una base temporal: permisos, revocación
  de rol, duplicados, referencias inexistentes, publicaciones simultáneas,
  revisión obsoleta, selección diaria estable y acceso a las Biblias.
- Navegador: migración de resultados v1, reinicios y recarga sin repetir palabras,
  puntuación diaria única, errores guardados antes de terminar la partida,
  repaso del pasaje exacto, orden de fichas repetidas y publicación/edición real.
- Recuperación del catálogo tras un fallo de red y bloqueo de retos vencidos
  sin conexión. Interfaz revisada a 375 px, incluyendo formularios y partidas.

La validación nativa cubre reglas, tipos, exportación y APK firmado; no se hizo
una instalación de esta versión en un teléfono físico durante esta entrega.
