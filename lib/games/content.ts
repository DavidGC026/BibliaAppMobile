export type GameId = "complete" | "memory" | "wordle"

export const GAME_CATALOG = [
  { id: "complete", title: "Completa el versículo", description: "Encuentra la palabra que falta y vuelve al pasaje para leerlo completo.", detail: "5 versículos · con opciones o de memoria", icon: "edit" },
  { id: "memory", title: "Memoria bíblica", description: "Da vuelta a las tarjetas y relaciona cada personaje con su historia.", detail: "4, 6 u 8 pares · a tu ritmo", icon: "groups" },
  { id: "wordle", title: "Wordle bíblico", description: "Una pista, una palabra y seis intentos. Cada letra te acerca a la respuesta.", detail: "Personajes, lugares y objetos", icon: "dictionary" },
] as const

export interface PassageReference {
  bookId: number
  chapter: number
  verse: number
  reference: string
}

export interface MemoryPair extends PassageReference {
  id: string
  left: string
  right: string
}

export const MEMORY_PAIRS: readonly MemoryPair[] = [
  { id: "noe", left: "Noé", right: "Construyó el arca", bookId: 1, chapter: 6, verse: 14, reference: "Génesis 6:14-22" },
  { id: "sara", left: "Sara", right: "Madre de Isaac", bookId: 1, chapter: 21, verse: 3, reference: "Génesis 21:3" },
  { id: "jose", left: "José", right: "Interpretó los sueños de Faraón", bookId: 1, chapter: 41, verse: 25, reference: "Génesis 41:25" },
  { id: "moises", left: "Moisés", right: "Recibió las tablas de la ley", bookId: 2, chapter: 31, verse: 18, reference: "Éxodo 31:18" },
  { id: "josue", left: "Josué", right: "Guio al pueblo en Jericó", bookId: 6, chapter: 6, verse: 2, reference: "Josué 6:2-5" },
  { id: "rut", left: "Rut", right: "Acompañó a su suegra Noemí", bookId: 8, chapter: 1, verse: 16, reference: "Rut 1:16" },
  { id: "david", left: "David", right: "Venció a Goliat", bookId: 9, chapter: 17, verse: 50, reference: "1 Samuel 17:50" },
  { id: "salomon", left: "Salomón", right: "Pidió sabiduría para gobernar", bookId: 11, chapter: 3, verse: 9, reference: "1 Reyes 3:9-12" },
  { id: "elias", left: "Elías", right: "Fue alimentado por cuervos", bookId: 11, chapter: 17, verse: 6, reference: "1 Reyes 17:6" },
  { id: "ester", left: "Ester", right: "Intercedió ante el rey por su pueblo", bookId: 17, chapter: 7, verse: 3, reference: "Ester 7:3-4" },
  { id: "daniel", left: "Daniel", right: "Sobrevivió al foso de los leones", bookId: 27, chapter: 6, verse: 22, reference: "Daniel 6:22" },
  { id: "jonas", left: "Jonás", right: "Oró dentro de un gran pez", bookId: 32, chapter: 2, verse: 1, reference: "Jonás 2:1" },
  { id: "maria", left: "María", right: "Madre de Jesús", bookId: 42, chapter: 1, verse: 31, reference: "Lucas 1:31" },
  { id: "bautista", left: "Juan el Bautista", right: "Bautizó a Jesús en el Jordán", bookId: 41, chapter: 1, verse: 9, reference: "Marcos 1:9" },
  { id: "pedro", left: "Pedro", right: "Pescador llamado a seguir a Jesús", bookId: 40, chapter: 4, verse: 18, reference: "Mateo 4:18-20" },
  { id: "zaqueo", left: "Zaqueo", right: "Subió a un sicómoro para ver a Jesús", bookId: 42, chapter: 19, verse: 4, reference: "Lucas 19:4" },
  { id: "tomas", left: "Tomás", right: "Dijo: Señor mío y Dios mío", bookId: 43, chapter: 20, verse: 28, reference: "Juan 20:28" },
  { id: "bernabe", left: "Bernabé", right: "Llamado hijo de consolación", bookId: 44, chapter: 4, verse: 36, reference: "Hechos 4:36" },
  { id: "pablo", left: "Pablo", right: "Encontró a Jesús camino a Damasco", bookId: 44, chapter: 9, verse: 3, reference: "Hechos 9:3-5" },
  { id: "lidia", left: "Lidia", right: "Vendedora de púrpura de Tiatira", bookId: 44, chapter: 16, verse: 14, reference: "Hechos 16:14" },
]

export interface WordPuzzle extends PassageReference {
  word: string
  clue: string
  category: "Personaje" | "Lugar" | "Objeto" | "Alimento"
}

export const WORD_PUZZLES: readonly WordPuzzle[] = [
  { word: "ADÁN", clue: "El primer hombre, colocado en el huerto para cuidarlo.", category: "Personaje", bookId: 1, chapter: 2, verse: 15, reference: "Génesis 2:15" },
  { word: "EDÉN", clue: "El huerto donde Dios puso al primer hombre.", category: "Lugar", bookId: 1, chapter: 2, verse: 8, reference: "Génesis 2:8" },
  { word: "ARCA", clue: "La construyó Noé para refugiarse del diluvio.", category: "Objeto", bookId: 1, chapter: 6, verse: 14, reference: "Génesis 6:14" },
  { word: "SARA", clue: "Esposa de Abraham y madre de Isaac.", category: "Personaje", bookId: 1, chapter: 21, verse: 3, reference: "Génesis 21:3" },
  { word: "JOSÉ", clue: "Hijo de Jacob que llegó a gobernar en Egipto.", category: "Personaje", bookId: 1, chapter: 41, verse: 41, reference: "Génesis 41:41" },
  { word: "MANÁ", clue: "Alimento que los israelitas recogían en el desierto.", category: "Alimento", bookId: 2, chapter: 16, verse: 31, reference: "Éxodo 16:31" },
  { word: "MOISÉS", clue: "Dios le habló desde una zarza que ardía sin consumirse.", category: "Personaje", bookId: 2, chapter: 3, verse: 4, reference: "Éxodo 3:4" },
  { word: "JERICÓ", clue: "Ciudad cuyas murallas cayeron después de que el pueblo marchara alrededor.", category: "Lugar", bookId: 6, chapter: 6, verse: 20, reference: "Josué 6:20" },
  { word: "SAMUEL", clue: "Siendo niño, escuchó que Dios lo llamaba por su nombre.", category: "Personaje", bookId: 9, chapter: 3, verse: 10, reference: "1 Samuel 3:10" },
  { word: "DAVID", clue: "Pastor que venció a Goliat con una honda y una piedra.", category: "Personaje", bookId: 9, chapter: 17, verse: 50, reference: "1 Samuel 17:50" },
  { word: "SALOMÓN", clue: "Rey que pidió un corazón entendido para gobernar al pueblo.", category: "Personaje", bookId: 11, chapter: 3, verse: 9, reference: "1 Reyes 3:9" },
  { word: "ELÍAS", clue: "Profeta que fue alimentado por cuervos junto al arroyo Querit.", category: "Personaje", bookId: 11, chapter: 17, verse: 6, reference: "1 Reyes 17:6" },
  { word: "ESTER", clue: "Reina que intercedió por su pueblo ante Asuero.", category: "Personaje", bookId: 17, chapter: 7, verse: 3, reference: "Ester 7:3" },
  { word: "DANIEL", clue: "Dios envió un ángel para cerrar la boca de los leones cuando él estaba en el foso.", category: "Personaje", bookId: 27, chapter: 6, verse: 22, reference: "Daniel 6:22" },
  { word: "JONÁS", clue: "Profeta enviado a Nínive que intentó huir hacia Tarsis.", category: "Personaje", bookId: 32, chapter: 1, verse: 3, reference: "Jonás 1:3" },
  { word: "BELÉN", clue: "Ciudad de Judea donde nació Jesús.", category: "Lugar", bookId: 40, chapter: 2, verse: 1, reference: "Mateo 2:1" },
  { word: "JORDÁN", clue: "Río donde Juan bautizó a Jesús.", category: "Lugar", bookId: 41, chapter: 1, verse: 9, reference: "Marcos 1:9" },
  { word: "MARÍA", clue: "Gabriel le anunció que sería la madre de Jesús.", category: "Personaje", bookId: 42, chapter: 1, verse: 30, reference: "Lucas 1:30-31" },
  { word: "PEDRO", clue: "Discípulo al que Jesús invitó a caminar sobre el agua.", category: "Personaje", bookId: 40, chapter: 14, verse: 29, reference: "Mateo 14:29" },
  { word: "PABLO", clue: "También llamado Saulo, se encontró con Jesús camino a Damasco.", category: "Personaje", bookId: 44, chapter: 9, verse: 4, reference: "Hechos 9:4-5; 13:9" },
  { word: "SION", clue: "Nombre del monte santo mencionado en el segundo salmo.", category: "Lugar", bookId: 19, chapter: 2, verse: 6, reference: "Salmos 2:6" },
  { word: "ABEL", clue: "Hijo de Adán y Eva que fue pastor de ovejas.", category: "Personaje", bookId: 1, chapter: 4, verse: 2, reference: "Génesis 4:2" },
  { word: "CAÍN", clue: "Hermano de Abel que se dedicaba a labrar la tierra.", category: "Personaje", bookId: 1, chapter: 4, verse: 2, reference: "Génesis 4:2" },
  { word: "ENOC", clue: "Caminó con Dios y desapareció porque Dios se lo llevó.", category: "Personaje", bookId: 1, chapter: 5, verse: 24, reference: "Génesis 5:24" },
  { word: "ISAAC", clue: "Nombre que Abraham puso al hijo que le dio Sara.", category: "Personaje", bookId: 1, chapter: 21, verse: 3, reference: "Génesis 21:3" },
  { word: "JACOB", clue: "Nació agarrado del talón de su hermano Esaú.", category: "Personaje", bookId: 1, chapter: 25, verse: 26, reference: "Génesis 25:26" },
  { word: "RAQUEL", clue: "Hija de Labán que llegó al pozo con las ovejas de su padre.", category: "Personaje", bookId: 1, chapter: 29, verse: 9, reference: "Génesis 29:6-9" },
  { word: "REBECA", clue: "Esposa de Isaac, a quien él llevó a la tienda de su madre Sara.", category: "Personaje", bookId: 1, chapter: 24, verse: 67, reference: "Génesis 24:67" },
  { word: "AARÓN", clue: "Hermano de Moisés que lo ayudó a hablar ante el pueblo.", category: "Personaje", bookId: 2, chapter: 4, verse: 14, reference: "Éxodo 4:14-16" },
  { word: "JOSUÉ", clue: "Sucesor de Moisés a quien Dios mandó cruzar el Jordán con el pueblo.", category: "Personaje", bookId: 6, chapter: 1, verse: 1, reference: "Josué 1:1-2" },
  { word: "CALEB", clue: "Explorador que siguió fielmente a Dios y recibió la promesa de entrar en la tierra.", category: "Personaje", bookId: 4, chapter: 14, verse: 24, reference: "Números 14:24" },
  { word: "GEDEÓN", clue: "Dios le dijo que vencería a Madián con solo trescientos hombres.", category: "Personaje", bookId: 7, chapter: 7, verse: 7, reference: "Jueces 7:7" },
  { word: "SANSÓN", clue: "Confesó que perdería su fuerza si le cortaban el cabello.", category: "Personaje", bookId: 7, chapter: 16, verse: 17, reference: "Jueces 16:17" },
  { word: "SAÚL", clue: "Primer rey de Israel, presentado por Samuel ante el pueblo.", category: "Personaje", bookId: 9, chapter: 10, verse: 24, reference: "1 Samuel 10:21-24" },
  { word: "ELISEO", clue: "Sucesor de Elías que golpeó el Jordán con el manto de su maestro.", category: "Personaje", bookId: 12, chapter: 2, verse: 14, reference: "2 Reyes 2:14" },
  { word: "ISAÍAS", clue: "Profeta que se ofreció a ser enviado cuando escuchó la voz del Señor en el templo.", category: "Personaje", bookId: 23, chapter: 6, verse: 8, reference: "Isaías 6:1-8" },
  { word: "JONATÁN", clue: "Hijo de Saúl que hizo un pacto de amistad con David.", category: "Personaje", bookId: 9, chapter: 18, verse: 3, reference: "1 Samuel 18:3" },
  { word: "ANDRÉS", clue: "Hermano de Simón Pedro que siguió a Jesús tras escuchar a Juan.", category: "Personaje", bookId: 43, chapter: 1, verse: 40, reference: "Juan 1:40" },
  { word: "TOMÁS", clue: "Discípulo que reconoció a Jesús resucitado como su Señor y su Dios.", category: "Personaje", bookId: 43, chapter: 20, verse: 28, reference: "Juan 20:28" },
  { word: "MARTA", clue: "Hermana de María que estaba ocupada con los quehaceres mientras Jesús enseñaba.", category: "Personaje", bookId: 42, chapter: 10, verse: 40, reference: "Lucas 10:38-40" },
  { word: "LÁZARO", clue: "Jesús lo llamó por su nombre y salió del sepulcro con las manos y los pies vendados.", category: "Personaje", bookId: 43, chapter: 11, verse: 43, reference: "Juan 11:43-44" },
  { word: "FELIPE", clue: "Explicó al funcionario etíope cómo el pasaje de Isaías anunciaba a Jesús.", category: "Personaje", bookId: 44, chapter: 8, verse: 35, reference: "Hechos 8:30-35" },
  { word: "ZAQUEO", clue: "Se subió a un sicómoro para poder ver a Jesús.", category: "Personaje", bookId: 42, chapter: 19, verse: 4, reference: "Lucas 19:2-4" },
  { word: "EGIPTO", clue: "País del que Dios sacó a Israel de la esclavitud.", category: "Lugar", bookId: 2, chapter: 20, verse: 2, reference: "Éxodo 20:2" },
  { word: "SINAÍ", clue: "Monte que se cubrió de humo cuando Dios descendió sobre él en fuego.", category: "Lugar", bookId: 2, chapter: 19, verse: 18, reference: "Éxodo 19:18" },
  { word: "NÍNIVE", clue: "Gran ciudad a la que Jonás fue a predicar después de recibir el mandato de Dios por segunda vez.", category: "Lugar", bookId: 32, chapter: 3, verse: 3, reference: "Jonás 3:1-3" },
  { word: "NAZARET", clue: "Ciudad donde Jesús se crio y entró en la sinagoga un día de reposo.", category: "Lugar", bookId: 42, chapter: 4, verse: 16, reference: "Lucas 4:16" },
  { word: "CANÁ", clue: "Población de Galilea donde Jesús convirtió el agua en vino durante una boda.", category: "Lugar", bookId: 43, chapter: 2, verse: 1, reference: "Juan 2:1-11" },
  { word: "HONDA", clue: "Instrumento con el que David lanzó la piedra que venció a Goliat.", category: "Objeto", bookId: 9, chapter: 17, verse: 50, reference: "1 Samuel 17:50" },
  { word: "ACEITE", clue: "Líquido de la vasija de una viuda que llenó muchos recipientes siguiendo las instrucciones de Eliseo.", category: "Alimento", bookId: 12, chapter: 4, verse: 2, reference: "2 Reyes 4:2-6" },
]

// Solo referencias: el texto se obtiene del catálogo autorizado de Biblias.
export const COMPLETION_PASSAGES = [
  [1, 1, 1], [6, 1, 9], [19, 23, 1], [19, 27, 1], [19, 46, 1],
  [19, 56, 3], [19, 100, 5], [19, 119, 105], [19, 121, 2], [20, 3, 5],
  [20, 17, 17], [23, 40, 31], [23, 41, 10], [24, 29, 11], [40, 5, 9],
  [40, 6, 33], [40, 11, 28], [43, 3, 16], [43, 8, 12], [43, 14, 6],
  [45, 8, 28], [45, 12, 21], [46, 13, 13], [47, 5, 7], [48, 5, 22],
  [49, 2, 8], [50, 4, 13], [52, 5, 16], [58, 11, 1], [62, 4, 8],
] as const
