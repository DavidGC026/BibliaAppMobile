/** Nombres en español (RVA) → bookId 1–66. ponytail: lista fija, sin fuzzy avanzado. */
const BOOK_BY_NAME: Record<string, number> = {
  génesis: 1,
  genesis: 1,
  éxodo: 2,
  exodo: 2,
  levítico: 3,
  levitico: 3,
  números: 4,
  numeros: 4,
  deuteronomio: 5,
  josué: 6,
  josue: 6,
  jueces: 7,
  rut: 8,
  '1 samuel': 9,
  '2 samuel': 10,
  '1 reyes': 11,
  '2 reyes': 12,
  '1 crónicas': 13,
  '1 cronicas': 13,
  '2 crónicas': 14,
  '2 cronicas': 14,
  esdras: 15,
  nehemías: 16,
  nehemias: 16,
  ester: 17,
  job: 18,
  salmos: 19,
  salmo: 19,
  proverbios: 20,
  eclesiastés: 21,
  eclesiastes: 21,
  cantares: 22,
  cantar: 22,
  isaías: 23,
  isaias: 23,
  jeremías: 24,
  jeremias: 24,
  lamentaciones: 25,
  ezequiel: 26,
  daniel: 27,
  oseas: 28,
  joel: 29,
  amós: 30,
  amos: 30,
  abdías: 31,
  abdias: 31,
  jonás: 32,
  jonas: 32,
  miqueas: 33,
  nahúm: 34,
  nahum: 34,
  habacuc: 35,
  sofonías: 36,
  sofonias: 36,
  hageo: 37,
  zacarías: 38,
  zacarias: 38,
  malaquías: 39,
  malaquias: 39,
  mateo: 40,
  marcos: 41,
  lucas: 42,
  juan: 43,
  hechos: 44,
  romanos: 45,
  '1 corintios': 46,
  '2 corintios': 47,
  gálatas: 48,
  galatas: 48,
  efesios: 49,
  filipenses: 50,
  colosenses: 51,
  '1 tesalonicenses': 52,
  '2 tesalonicenses': 53,
  '1 timoteo': 54,
  '2 timoteo': 55,
  tito: 56,
  filemón: 57,
  filemon: 57,
  hebreos: 58,
  santiago: 59,
  '1 pedro': 60,
  '2 pedro': 61,
  '1 juan': 62,
  '2 juan': 63,
  '3 juan': 64,
  judas: 65,
  apocalipsis: 66,
  revelación: 66,
  revelacion: 66,
};

function normBook(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function resolveBookId(bookPart: string): number | null {
  const key = normBook(bookPart);
  if (BOOK_BY_NAME[key] != null) return BOOK_BY_NAME[key];
  // "1Samuel" sin espacio
  const spaced = key.replace(/^(\d)([a-z])/i, '$1 $2');
  if (BOOK_BY_NAME[spaced] != null) return BOOK_BY_NAME[spaced];
  return null;
}

export type ParsedVerseRef = { bookId: number; chapter: number; verse?: number };

/** Parsea referencias como "Salmos 23:1" o "Juan 3:16". */
export function parseVerseReference(ref: string): ParsedVerseRef | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  const withVerse = trimmed.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*\d+)?$/);
  if (withVerse) {
    const bookId = resolveBookId(withVerse[1]);
    if (!bookId) return null;
    return { bookId, chapter: Number(withVerse[2]), verse: Number(withVerse[3]) };
  }

  const chapterOnly = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (chapterOnly) {
    const bookId = resolveBookId(chapterOnly[1]);
    if (!bookId) return null;
    return { bookId, chapter: Number(chapterOnly[2]) };
  }

  return null;
}
