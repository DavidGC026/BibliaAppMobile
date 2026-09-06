import { GAME_CATALOG, type GameId, type WordPuzzle } from "./content"
import { WORD_CATEGORIES, gameDay } from "./catalog"
import { normalizeAnswer, type GameVerse } from "./engine"
import type { ReviewItem } from "./review"

export type VerseLevel = "initial" | "intermediate" | "advanced"
export type LevelChoice = "auto" | VerseLevel
export const LEVEL_LABELS: Record<LevelChoice, string> = { auto: "Automática", initial: "Inicial", intermediate: "Intermedia", advanced: "Avanzada" }
export interface WordFilters { length: number | null; category: string | null }
export const defaultFilters = (): WordFilters => ({ length: null, category: null })
export function parseFilters(value: unknown): WordFilters {
  const filters = value as WordFilters | null
  return {
    length: [4, 5, 6, 7].includes(filters?.length ?? 0) ? filters!.length : null,
    category: WORD_CATEGORIES.includes(filters?.category as typeof WORD_CATEGORIES[number]) ? filters!.category : null,
  }
}
export function filterWords(words: readonly WordPuzzle[], filters: WordFilters) {
  return words.filter(puzzle => (!filters.length || normalizeAnswer(puzzle.word).length === filters.length) && (!filters.category || puzzle.category === filters.category))
}
export function filterKey(filters: WordFilters) { return `${filters.length ?? "all"}:${filters.category ?? "all"}` }
export interface WordCycle { counts: Record<string, number>; last: string; floor?: number }
export function chooseFilteredWord(words: readonly WordPuzzle[], cycle?: WordCycle, random = Math.random) {
  if (!words.length) throw new Error("No hay palabras con esos filtros. Elige otra longitud o categoría.")
  const known = words.map(word => cycle?.counts[normalizeAnswer(word.word)]).filter((count): count is number => count !== undefined)
  const missing = cycle?.floor ?? (known.length ? Math.min(...known) : 0)
  const count = (word: WordPuzzle) => cycle?.counts[normalizeAnswer(word.word)] ?? missing
  const floor = Math.min(...words.map(count))
  let candidates = words.filter(word => count(word) === floor)
  if (candidates.length > 1) candidates = candidates.filter(word => normalizeAnswer(word.word) !== cycle?.last)
  const puzzle = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]
  return { puzzle, count: count(puzzle), pool: words.map(word => normalizeAnswer(word.word)) }
}

export interface LearningActivity {
  id: string; at: number; day: string; game: GameId
  kind: "result" | "answer" | "review"
  correct: boolean; score?: number; mode: "free" | "daily" | "review"
  level?: VerseLevel; title?: string; topic?: string
}
export function automaticLevel(activity: readonly LearningActivity[], game: GameId): VerseLevel {
  const rounds = activity.filter(item => item.kind === "result" && item.mode === "free" && item.game === game)
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
  if (rounds.length < 3) return "initial"
  const average = rounds.slice(-3).reduce((sum, item) => sum + (item.score ?? 0), 0) / 3
  if (rounds.length >= 6 && average >= 80) return "advanced"
  return average >= 60 ? "intermediate" : "initial"
}
export function selectLevelVerses(verses: readonly GameVerse[], level?: VerseLevel, minimum = 5): GameVerse[] {
  if (!level) return [...verses]
  const ordered = [...verses].sort((a, b) => a.text.trim().split(/\s+/u).length - b.text.trim().split(/\s+/u).length || a.bookId - b.bookId || a.chapter - b.chapter || a.verse - b.verse)
  const size = Math.min(ordered.length, Math.max(minimum, Math.ceil(ordered.length / 3)))
  const offset = level === "initial" ? 0 : level === "advanced" ? ordered.length - size : Math.floor((ordered.length - size) / 2)
  return ordered.slice(offset, offset + size)
}
export function dateBefore(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}
export function weeklySummary(activity: readonly LearningActivity[], reviews: readonly ReviewItem[], today = gameDay()) {
  const days = Array.from({ length: 7 }, (_, index) => dateBefore(today, 6 - index))
  const week = activity.filter(item => item.day >= days[0] && item.day <= today)
  const results = week.filter(item => item.kind === "result")
  const answers = week.filter(item => item.kind === "answer")
  const learned = [...new Set(week.filter(item => item.correct && item.title && (item.kind === "answer" || item.game === "wordle")).map(item => item.title!))].slice(-8).reverse()
  const topics = new Map<string, number>()
  reviews.forEach(item => {
    const topic = item.target.kind === "wordle" ? item.target.puzzle.category : item.target.passage.reference.replace(/\s+\d+:\d+.*$/, "")
    topics.set(topic, (topics.get(topic) ?? 0) + 1)
  })
  return {
    days: days.map(day => ({ day, count: week.filter(item => item.day === day && (item.kind === "result" || item.kind === "review")).length })),
    played: results.length, points: results.reduce((sum, item) => sum + (item.score ?? 0), 0),
    reviews: week.filter(item => item.kind === "review").length,
    correct: answers.filter(item => item.correct).length, answers: answers.length, learned,
    games: GAME_CATALOG.map(game => ({ ...game, count: results.filter(item => item.game === game.id).length })),
    topics: [...topics].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(([name, count]) => ({ name, count })),
  }
}
