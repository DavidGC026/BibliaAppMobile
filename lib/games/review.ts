import type { PassageReference, WordPuzzle } from "./content"
import { normalizeAnswer } from "./engine"
import { parseCoordinates, parseWord, passageKey } from "./catalog"

export type ReviewTarget = { kind: "wordle"; puzzle: WordPuzzle } | { kind: "complete" | "order"; passage: PassageReference; bibleId: number }
export type ReviewAttempt = { target: ReviewTarget; correct: boolean; id?: string }
export type OnReviewAttempt = (attempt: ReviewAttempt) => void
export interface ReviewItem { key: string; target: ReviewTarget; due: string; successes: number; misses: number; lastSuccess: string | null }
export function reviewKey(target: ReviewTarget) {
  return target.kind === "wordle" ? `wordle:${normalizeAnswer(target.puzzle.word)}` : `${target.kind}:${target.bibleId}:${passageKey(target.passage)}`
}
export function reviewTitle(target: ReviewTarget) { return target.kind === "wordle" ? target.puzzle.word : target.passage.reference }
function addDays(day: string, count: number) { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10) }
export function updateReview(items: readonly ReviewItem[], { target, correct }: ReviewAttempt, today: string): ReviewItem[] {
  const key = reviewKey(target)
  const previous = items.find(item => item.key === key)
  if (correct && (!previous || previous.lastSuccess === today)) return [...items]
  const successes = correct ? previous!.successes + 1 : 0
  const remaining = items.filter(item => item.key !== key)
  if (successes >= 4) return remaining
  const item: ReviewItem = {
    key, target, successes, misses: (previous?.misses ?? 0) + Number(!correct),
    due: correct ? addDays(today, [1, 3, 7][successes - 1]) : today,
    lastSuccess: correct ? today : null,
  }
  return [...remaining, item].slice(-200)
}
export function parseReview(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) return []
  const items = new Map<string, ReviewItem>()
  for (const row of value.slice(-200)) {
    try {
      const raw = row.target
      let target: ReviewTarget
      if (raw.kind === "wordle") target = { kind: "wordle", puzzle: parseWord(raw.puzzle) }
      else {
        if (!["complete", "order"].includes(raw.kind) || !Number.isSafeInteger(raw.bibleId) || raw.bibleId <= 0 || typeof raw.passage.reference !== "string") continue
        target = { kind: raw.kind, bibleId: raw.bibleId, passage: { ...parseCoordinates(raw.passage), reference: raw.passage.reference.slice(0, 120) } }
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.due) || !Number.isSafeInteger(row.successes) || row.successes < 0 || row.successes > 3 || !Number.isSafeInteger(row.misses) || row.misses < 0) continue
      const key = reviewKey(target)
      items.set(key, { key, target, due: row.due, successes: row.successes, misses: row.misses, lastSuccess: typeof row.lastSuccess === "string" ? row.lastSuccess : null })
    } catch { /* Una entrada dañada no descarta los demás repasos. */ }
  }
  return [...items.values()]
}
