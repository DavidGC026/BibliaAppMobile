import { GAME_CATALOG, type GameId } from "./content"
import { parseCoordinates, parsePair, parseWord, type Coordinates } from "./catalog"
import { parseReview } from "./review"
import type { RoundSettings } from "./round"

export interface RoundCheckpoint {
  started?: boolean; bibleId?: number; difficulty?: "options" | "write"; pairCount?: number
  index?: number; answers?: (string | boolean)[]; draft?: string
  selected?: number[]; guesses?: string[]; hints?: number[]
  flipped?: string[]; matched?: string[]; attempts?: number
  passages?: Coordinates[]
}
export interface SavedRound {
  id: string; game: GameId; settings: RoundSettings; checkpoint: RoundCheckpoint
  createdAt: number; updatedAt: number
}
export const ROUND_LIFETIME_MS = 7 * 86400000
export function validId(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9:_-]{1,150}$/.test(value) && !["__proto__", "prototype", "constructor"].includes(value) }
function integer(value: unknown, max: number) { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max }
export function parseCheckpoint(value: unknown): RoundCheckpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("El guardado de la partida no es válido.")
  const raw = value as RoundCheckpoint
  const checkpoint: RoundCheckpoint = {}
  if (typeof raw.started === "boolean") checkpoint.started = raw.started
  if (integer(raw.bibleId, 1000000) && raw.bibleId! > 0) checkpoint.bibleId = raw.bibleId
  if (raw.difficulty === "options" || raw.difficulty === "write") checkpoint.difficulty = raw.difficulty
  if ([4, 6, 8].includes(raw.pairCount ?? 0)) checkpoint.pairCount = raw.pairCount
  if (integer(raw.index, 5)) checkpoint.index = raw.index
  if (integer(raw.attempts, 100000)) checkpoint.attempts = raw.attempts
  if (typeof raw.draft === "string") checkpoint.draft = raw.draft.slice(0, 120)
  if (Array.isArray(raw.passages) && raw.passages.length <= 500) checkpoint.passages = raw.passages.map(parseCoordinates)
  if (Array.isArray(raw.answers) && raw.answers.length <= 5 && raw.answers.every(answer => typeof answer === "boolean" || typeof answer === "string" && answer.length <= 120)) checkpoint.answers = raw.answers
  for (const field of ["selected", "hints"] as const) {
    const items = raw[field]
    if (Array.isArray(items) && items.length <= 40 && items.every(item => integer(item, 39)) && new Set(items).size === items.length) checkpoint[field] = items
  }
  for (const field of ["guesses", "flipped", "matched"] as const) {
    const items = raw[field]
    const limit = field === "guesses" ? 6 : field === "flipped" ? 2 : 8
    if (Array.isArray(items) && items.length <= limit && items.every(item => typeof item === "string" && item.length <= 140) && new Set(items).size === items.length) checkpoint[field] = items
  }
  return checkpoint
}
export function parseSavedRound(value: unknown): SavedRound {
  const raw = value as SavedRound
  if (!raw || !validId(raw.id) || !GAME_CATALOG.some(game => game.id === raw.game) || !integer(raw.createdAt, 4102444800000) || !integer(raw.updatedAt, 4102444800000)) throw new Error("La partida guardada no es válida.")
  const original = raw.settings
  if (!original || !["free", "daily", "review"].includes(original.mode) || typeof original.seed !== "string" || original.seed.length > 200) throw new Error("Las opciones de la partida no son válidas.")
  const settings: RoundSettings = { mode: original.mode, seed: original.seed }
  if (original.dailyDate && /^\d{4}-\d{2}-\d{2}$/.test(original.dailyDate)) settings.dailyDate = original.dailyDate
  if (original.word) settings.word = parseWord(original.word)
  if (original.pairs) {
    if (!Array.isArray(original.pairs) || original.pairs.length < 4 || original.pairs.length > 500) throw new Error("Las parejas guardadas no son válidas.")
    settings.pairs = original.pairs.map(parsePair)
    if (new Set(settings.pairs.map(pair => pair.id)).size !== settings.pairs.length) throw new Error("Hay parejas repetidas en el guardado.")
  }
  if (["initial", "intermediate", "advanced"].includes(original.level ?? "")) settings.level = original.level
  if (original.passages) {
    if (!Array.isArray(original.passages) || original.passages.length > 500) throw new Error("Los pasajes guardados no son válidos.")
    settings.passages = original.passages.map(parseCoordinates)
  }
  if (original.review) {
    const review = parseReview([{ target: original.review, due: "2026-01-01", successes: 0, misses: 1, lastSuccess: null }])[0]
    if (!review || review.target.kind !== raw.game) throw new Error("El repaso guardado no es válido.")
    settings.review = review.target
  }
  if (settings.mode === "daily" && !settings.dailyDate || settings.mode === "review" && !settings.review || raw.game === "wordle" && !settings.word) throw new Error("Falta contenido de la partida guardada.")
  return { id: raw.id, game: raw.game, settings, checkpoint: parseCheckpoint(raw.checkpoint), createdAt: raw.createdAt, updatedAt: raw.updatedAt }
}
