import { GAME_CATALOG, type GameId } from "./content"

export interface GameResult {
  id: string
  game: GameId
  score: number
  won: boolean
}

export interface GameStats {
  played: number
  won: number
  best: number
  points: number
}

export interface GamesProgress {
  version: 1
  games: Record<GameId, GameStats>
  recentIds: string[]
}

export function emptyProgress(): GamesProgress {
  const stats = () => ({ played: 0, won: 0, best: 0, points: 0 })
  return { version: 1, games: { complete: stats(), memory: stats(), wordle: stats() }, recentIds: [] }
}

export function parseProgress(raw: string | null): GamesProgress {
  const progress = emptyProgress()
  if (!raw) return progress
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1) return progress
    for (const { id } of GAME_CATALOG) {
      const stats = parsed.games?.[id]
      if (!stats || ![stats.played, stats.won, stats.best, stats.points].every((value) => Number.isSafeInteger(value) && value >= 0)) continue
      if (stats.won > stats.played || stats.best > 100) continue
      progress.games[id] = { played: stats.played, won: stats.won, best: stats.best, points: stats.points }
    }
    progress.recentIds = Array.isArray(parsed.recentIds) ? parsed.recentIds.filter((id: unknown) => typeof id === "string").slice(-100) : []
  } catch { /* Una preferencia dañada no impide jugar. */ }
  return progress
}

export function recordResult(progress: GamesProgress, result: GameResult): GamesProgress {
  if (progress.recentIds.includes(result.id)) return progress
  const current = progress.games[result.game]
  const score = Math.max(0, Math.min(100, Math.round(result.score)))
  return {
    version: 1,
    games: { ...progress.games, [result.game]: {
      played: current.played + 1, won: current.won + Number(result.won),
      best: Math.max(current.best, score), points: current.points + score,
    } },
    recentIds: [...progress.recentIds, result.id].slice(-100),
  }
}
