import { GAME_CATALOG, type GameId } from "./content"
import { parseReview, type ReviewItem } from "./review"

export interface GameResult {
  id: string
  game: GameId
  score: number
  won: boolean
  dailyKey?: string
}

export interface GameStats {
  played: number
  won: number
  best: number
  points: number
}

export interface GamesProgress {
  version: 2
  games: Record<GameId, GameStats>
  recentIds: string[]
  wordCycle: string[]
  dailyScores: Record<string, { score: number; won: boolean }>
  reviews: ReviewItem[]
}

export function emptyProgress(): GamesProgress {
  const stats = () => ({ played: 0, won: 0, best: 0, points: 0 })
  return { version: 2, games: { complete: stats(), memory: stats(), wordle: stats(), order: stats() }, recentIds: [], wordCycle: [], dailyScores: {}, reviews: [] }
}

export function parseProgress(raw: string | null): GamesProgress {
  const progress = emptyProgress()
  if (!raw) return progress
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1 && parsed?.version !== 2) return progress
    for (const { id } of GAME_CATALOG) {
      const stats = parsed.games?.[id]
      if (!stats || ![stats.played, stats.won, stats.best, stats.points].every((value) => Number.isSafeInteger(value) && value >= 0)) continue
      if (stats.won > stats.played || stats.best > 100) continue
      progress.games[id] = { played: stats.played, won: stats.won, best: stats.best, points: stats.points }
    }
    progress.recentIds = Array.isArray(parsed.recentIds) ? parsed.recentIds.filter((id: unknown) => typeof id === "string").slice(-100) : []
    progress.wordCycle = Array.isArray(parsed.wordCycle) ? [...new Set<string>(parsed.wordCycle.filter((word: unknown) => typeof word === "string" && /^[A-ZÑ]{4,7}$/.test(word)))].slice(-500) : []
    progress.reviews = parseReview(parsed.reviews)
    if (parsed.dailyScores && typeof parsed.dailyScores === "object") {
      for (const [key, value] of Object.entries(parsed.dailyScores).slice(-480)) {
        const score = value as { score: number; won: boolean }
        if (/^\d{4}-\d{2}-\d{2}:(complete|memory|wordle|order)$/.test(key) && score && Number.isSafeInteger(score.score) && score.score >= 0 && score.score <= 100 && typeof score.won === "boolean") progress.dailyScores[key] = score
      }
    }
  } catch { /* Una preferencia dañada no impide jugar. */ }
  return progress
}

export function recordResult(progress: GamesProgress, result: GameResult): GamesProgress {
  if (progress.recentIds.includes(result.id) || (result.dailyKey && progress.dailyScores[result.dailyKey])) return progress
  const current = progress.games[result.game]
  const score = Math.max(0, Math.min(100, Math.round(result.score)))
  return {
    ...progress,
    games: { ...progress.games, [result.game]: {
      played: current.played + 1, won: current.won + Number(result.won),
      best: Math.max(current.best, score), points: current.points + score,
    } },
    recentIds: [...progress.recentIds, result.id].slice(-100),
    dailyScores: result.dailyKey ? Object.fromEntries(Object.entries({ ...progress.dailyScores, [result.dailyKey]: { score, won: result.won } }).sort(([a], [b]) => a.localeCompare(b)).slice(-480)) : progress.dailyScores,
  }
}
