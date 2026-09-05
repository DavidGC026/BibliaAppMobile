import type { MemoryPair, WordPuzzle } from "./content"
import type { ReviewTarget, OnReviewAttempt } from "./review"
export interface RoundSettings {
  mode: "free" | "daily" | "review"
  seed: string
  dailyDate?: string
  word?: WordPuzzle
  pairs?: readonly MemoryPair[]
  review?: ReviewTarget
}
export interface RoundContext { settings?: RoundSettings; onAttempt?: OnReviewAttempt }
export function verseQuery(settings?: RoundSettings, bibleId?: number | null) {
  const query = new URLSearchParams()
  if (bibleId) query.set("bible", String(bibleId))
  if (settings?.dailyDate) query.set("daily", settings.dailyDate)
  if (settings?.review && settings.review.kind !== "wordle") {
    const { passage } = settings.review
    query.set("bible", String(settings.review.bibleId))
    query.set("passage", `${passage.bookId}:${passage.chapter}:${passage.verse}`)
  }
  return `/api/games/verses${query.size ? `?${query}` : ""}`
}
