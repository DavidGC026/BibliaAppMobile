import { COMPLETION_PASSAGES, MEMORY_PAIRS, WORD_PUZZLES, type MemoryPair, type PassageReference, type WordPuzzle } from "./content"
import { normalizeAnswer, shuffle } from "./engine"

export type Coordinates = Pick<PassageReference, "bookId" | "chapter" | "verse">
export interface GameContent { words: WordPuzzle[]; pairs: MemoryPair[]; passages: Coordinates[] }
export interface DailyChallenge { date: string; word: WordPuzzle; pairs: MemoryPair[]; passages: Coordinates[] }
export interface ContentEnvelope { revision: number; catalog: GameContent; daily: DailyChallenge; serverTime: number }
export interface EditorCatalog { revision: number; catalog: GameContent; books: { bookId: number; name: string }[] }
export const WORD_CATEGORIES = ["Personaje", "Lugar", "Objeto", "Alimento"] as const
export const DEFAULT_CONTENT: GameContent = {
  words: [...WORD_PUZZLES], pairs: [...MEMORY_PAIRS],
  passages: COMPLETION_PASSAGES.map(([bookId, chapter, verse]) => ({ bookId, chapter, verse })),
}

export function passageKey(passage: Coordinates) { return `${passage.bookId}:${passage.chapter}:${passage.verse}` }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("La entrada debe contener sus campos.")
  return value as Record<string, unknown>
}
function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label}: escribe entre 1 y ${max} caracteres.`)
  return value.trim()
}
export function parseCoordinates(value: unknown): Coordinates {
  const row = object(value)
  for (const [key, max] of [["bookId", 66], ["chapter", 150], ["verse", 176]] as const) {
    if (!Number.isSafeInteger(row[key]) || Number(row[key]) < 1 || Number(row[key]) > max) throw new Error("Elige un libro, capítulo y versículo válidos.")
  }
  return { bookId: Number(row.bookId), chapter: Number(row.chapter), verse: Number(row.verse) }
}
export function parseWord(value: unknown): WordPuzzle {
  const row = object(value)
  const word = text(row.word, "Palabra", 20).toUpperCase().normalize("NFC")
  if (!/^[A-ZÑ]{4,7}$/.test(normalizeAnswer(word))) throw new Error("La palabra debe tener de 4 a 7 letras, sin espacios ni signos.")
  if (!WORD_CATEGORIES.includes(row.category as WordPuzzle["category"])) throw new Error("Elige una categoría válida.")
  return { ...parseCoordinates(row), word, clue: text(row.clue, "Pista", 300), category: row.category as WordPuzzle["category"], reference: text(row.reference, "Referencia", 120) }
}
export function parsePair(value: unknown): MemoryPair {
  const row = object(value)
  const id = text(row.id, "Identificador", 80)
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("El identificador de la pareja no es válido.")
  return { ...parseCoordinates(row), id, left: text(row.left, "Personaje", 80), right: text(row.right, "Historia", 180), reference: text(row.reference, "Referencia", 120) }
}
function entries(value: unknown, min: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > 500) throw new Error(`${label}: conserva entre ${min} y 500 entradas.`)
  return value
}
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`Hay ${label} repetidos. Revisa las entradas, incluso las tildes y mayúsculas.`)
}
export function parseGameContent(value: unknown): GameContent {
  const row = object(value)
  const words = entries(row.words, 1, "Wordle").map(parseWord)
  const pairs = entries(row.pairs, 8, "Memoria").map(parsePair)
  const passages = entries(row.passages, 5, "Versículos").map(parseCoordinates)
  unique(words.map(word => normalizeAnswer(word.word)), "palabras")
  for (const key of ["id", "left", "right"] as const) unique(pairs.map(pair => normalizeAnswer(pair[key])), "datos de parejas")
  unique(passages.map(passageKey), "versículos")
  return { words, pairs, passages }
}

export function gameDay(now: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)!.value
  return `${part("year")}-${part("month")}-${part("day")}`
}
export function seededRandom(seed: string): () => number {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    state += 0x6D2B79F5
    let mixed = Math.imul(state ^ state >>> 15, 1 | state)
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed)
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296
  }
}
export function createDailyChallenge(catalog: GameContent, date: string): DailyChallenge {
  return {
    date, word: shuffle(catalog.words, seededRandom(`${date}:wordle`))[0],
    pairs: shuffle(catalog.pairs, seededRandom(`${date}:memory`)).slice(0, 6),
    passages: shuffle(catalog.passages, seededRandom(`${date}:verses`)).slice(0, 5),
  }
}
export function selectUnseenWord(words: readonly WordPuzzle[], seen: readonly string[], random = Math.random) {
  const available = new Set(words.map(word => normalizeAnswer(word.word)))
  let visited = [...new Set(seen.filter(word => available.has(word)))]
  let candidates = words.filter(word => !visited.includes(normalizeAnswer(word.word)))
  if (!candidates.length) {
    candidates = words.filter(word => words.length === 1 || normalizeAnswer(word.word) !== visited.at(-1))
    visited = []
  }
  const puzzle = shuffle(candidates, random)[0]
  if (!puzzle) throw new Error("No hay palabras disponibles.")
  return { puzzle, seen: [...visited, normalizeAnswer(puzzle.word)] }
}
