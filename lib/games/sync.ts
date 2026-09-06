import { GAME_CATALOG, type GameId } from "./content"
import { gameDay, parseWord } from "./catalog"
import { normalizeAnswer } from "./engine"
import { emptyProgress, parseProgress, recordResult, type GameResult, type GamesProgress } from "./progress"
import { parseReview, reviewKey, updateReview, type ReviewAttempt } from "./review"
import { parseSavedRound, validId, ROUND_LIFETIME_MS, type SavedRound } from "./saved-round"
import { dateBefore, filterKey, parseFilters, type LearningActivity, type VerseLevel, type WordCycle, type WordFilters } from "./training"

export interface AccountProgress {
  version: 3; totals: GamesProgress
  cycles: Record<string, WordCycle>; rounds: Record<string, SavedRound>
  closedRounds: Record<string, number>; reviewClocks: Record<string, { at: number; id: string }>
  activity: LearningActivity[]; recentOperations: string[]
}
interface OperationHeader { id: string; at: number }
export type ProgressOperation = OperationHeader & (
  | { type: "import"; progress: GamesProgress }
  | { type: "start"; round: SavedRound; wordUse?: { filters: WordFilters; count: number; pool: string[] } }
  | { type: "save"; round: SavedRound }
  | { type: "discard"; roundId: string }
  | { type: "result"; roundId: string; result: GameResult; mode: "free" | "daily" | "review"; level?: VerseLevel; word?: string }
  | { type: "attempt"; roundId: string; attempt: ReviewAttempt; mode: "free" | "daily" | "review" }
)
export interface ProgressSyncReply { progress: AccountProgress; acknowledged: string[]; serverTime: number }
export const emptyAccount = (): AccountProgress => ({ version: 3, totals: emptyProgress(), cycles: {}, rounds: {}, closedRounds: {}, reviewClocks: {}, activity: [], recentOperations: [] })
const isTime = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 946684800000 && Number(value) <= 4102444800000
const isGame = (value: unknown): value is GameId => GAME_CATALOG.some(game => game.id === value)
function requireRoundId(value: unknown): string {
  if (!validId(value)) throw new Error("Identificador de partida inválido.")
  return value
}
export function parseOperation(value: unknown): ProgressOperation {
  const raw = value as ProgressOperation
  if (!raw || !validId(raw.id) || !isTime(raw.at)) throw new Error("El cambio de progreso no es válido.")
  const header = { id: raw.id, at: raw.at }
  if (raw.type === "import") {
    if (raw.progress?.version !== 2) throw new Error("El historial anterior no es válido.")
    return { ...header, type: raw.type, progress: parseProgress(JSON.stringify(raw.progress)) }
  }
  if (raw.type === "start" || raw.type === "save") {
    const round = parseSavedRound(raw.round)
    if (raw.type === "save") return { ...header, type: raw.type, round }
    const wordUse = raw.wordUse && Number.isSafeInteger(raw.wordUse.count) && raw.wordUse.count >= 0 && raw.wordUse.count < 1000000 && Array.isArray(raw.wordUse.pool) && raw.wordUse.pool.length > 0 && raw.wordUse.pool.length <= 500 && raw.wordUse.pool.every(word => typeof word === "string" && /^[A-ZÑ]{4,7}$/.test(word))
      ? { filters: parseFilters(raw.wordUse.filters), count: raw.wordUse.count, pool: [...new Set(raw.wordUse.pool)] } : undefined
    if (raw.wordUse && !wordUse) throw new Error("El catálogo del ciclo no es válido.")
    if (wordUse && (round.game !== "wordle" || round.settings.mode !== "free")) throw new Error("El ciclo de palabras no corresponde a esa partida.")
    return { ...header, type: raw.type, round, wordUse }
  }
  if (raw.type === "discard") return { ...header, type: raw.type, roundId: requireRoundId(raw.roundId) }
  if (raw.type === "result") {
    const roundId = requireRoundId(raw.roundId)
    const result = raw.result
    if (!result || !isGame(result.game) || !Number.isSafeInteger(result.score) || result.score < 0 || result.score > 100 || typeof result.won !== "boolean" || !["free", "daily", "review"].includes(raw.mode)) throw new Error("El resultado de la partida no es válido.")
    if (result.dailyKey && (!/^\d{4}-\d{2}-\d{2}:(complete|memory|wordle|order)$/.test(result.dailyKey) || !result.dailyKey.endsWith(`:${result.game}`))) throw new Error("El resultado diario no es válido.")
    if (raw.mode === "daily" && !result.dailyKey || raw.mode !== "daily" && result.dailyKey) throw new Error("La modalidad del resultado no es válida.")
    const level = ["initial", "intermediate", "advanced"].includes(raw.level ?? "") ? raw.level : undefined
    return { ...header, type: raw.type, roundId, result: { id: `result:${roundId}`, game: result.game, score: result.score, won: result.won, dailyKey: result.dailyKey }, mode: raw.mode, level, word: typeof raw.word === "string" ? raw.word.slice(0, 7) : undefined }
  }
  if (raw.type === "attempt") {
    const target = parseReview([{ target: raw.attempt?.target, due: "2026-01-01", successes: 0, misses: 1, lastSuccess: null }])[0]?.target
    if (!target || typeof raw.attempt?.correct !== "boolean" || !["free", "daily", "review"].includes(raw.mode)) throw new Error("El intento de repaso no es válido.")
    return { ...header, type: raw.type, roundId: requireRoundId(raw.roundId), attempt: { target, correct: raw.attempt.correct }, mode: raw.mode }
  }
  throw new Error("No se reconoce ese cambio de progreso.")
}

function importHistory(account: AccountProgress, previous: GamesProgress) {
  // Los totales v2 son locales: cada instalación los importa una sola vez.
  // Sus resultados diarios conocidos se separan para combinarlos por fecha.
  const imported = parseProgress(JSON.stringify(previous))
  const dailyEntries = Object.entries(imported.dailyScores)
  for (const [key, result] of dailyEntries) {
    const game = key.split(":")[1] as GameId
    const stats = imported.games[game]
    stats.played = Math.max(0, stats.played - 1)
    stats.won = Math.max(0, stats.won - Number(result.won))
    stats.points = Math.max(0, stats.points - result.score)
  }
  for (const { id } of GAME_CATALOG) {
    const current = account.totals.games[id], added = imported.games[id]
    account.totals.games[id] = { played: current.played + added.played, won: current.won + added.won, points: current.points + added.points, best: Math.max(current.best, added.best) }
  }
  for (const [key, result] of dailyEntries) account.totals = recordResult(account.totals, { id: `legacy-daily:${key}`, game: key.split(":")[1] as GameId, ...result, dailyKey: key })
  const existing = new Set(account.totals.reviews.map(item => item.key))
  account.totals.reviews = [...account.totals.reviews, ...imported.reviews.filter(item => !existing.has(item.key) && !account.reviewClocks[item.key])].slice(-200)
  const cycle = account.cycles["all:all"] ?? { counts: {}, last: "", floor: 0 }
  for (const word of imported.wordCycle) cycle.counts[word] = Math.max(cycle.counts[word] ?? 0, 1)
  cycle.last ||= imported.wordCycle.at(-1) ?? ""
  account.cycles["all:all"] = cycle
}
export function applyOperation(previous: AccountProgress, operation: ProgressOperation, now = Date.now()): AccountProgress {
  if (previous.recentOperations.includes(operation.id)) return previous
  const account: AccountProgress = JSON.parse(JSON.stringify(previous))
  const day = gameDay(operation.at)
  const activity = (item: Omit<LearningActivity, "id" | "at" | "day">, suffix = "") => account.activity.push({ ...item, id: operation.id + suffix, at: operation.at, day })
  if (operation.type === "import") importHistory(account, operation.progress)
  if (operation.type === "start" || operation.type === "save") {
    const round = operation.round
    const saved = account.rounds[round.id]
    if (!account.closedRounds[round.id] && round.updatedAt >= now - ROUND_LIFETIME_MS && (!saved || round.updatedAt >= saved.updatedAt)) account.rounds[round.id] = round
    if (operation.type === "start" && operation.wordUse && round.settings.word) {
      const key = filterKey(operation.wordUse.filters)
      const cycle = account.cycles[key] ?? { counts: {}, last: "", floor: 0 }
      const word = normalizeAnswer(round.settings.word.word)
      for (const candidate of operation.wordUse.pool) cycle.counts[candidate] ??= operation.wordUse.count
      cycle.counts[word] = Math.max(cycle.counts[word] ?? 0, operation.wordUse.count) + 1
      cycle.last = word
      cycle.floor = Math.min(...operation.wordUse.pool.map(candidate => cycle.counts[candidate]))
      account.cycles[key] = cycle
    }
  }
  if (operation.type === "result" || operation.type === "discard") {
    delete account.rounds[operation.roundId]
    account.closedRounds[operation.roundId] = operation.at
  }
  if (operation.type === "result") {
    const scored = recordResult(account.totals, operation.result)
    if (scored !== account.totals) activity({ kind: "result", game: operation.result.game, score: operation.result.score, correct: operation.result.won, mode: operation.mode, level: operation.level, title: operation.result.won ? operation.word : undefined })
    account.totals = scored
  }
  if (operation.type === "attempt") {
    const { target, correct } = operation.attempt
    const key = reviewKey(target), clock = account.reviewClocks[key]
    const title = target.kind === "wordle" ? target.puzzle.word : target.passage.reference
    activity({ kind: "answer", game: target.kind, correct, mode: operation.mode, title, topic: target.kind === "wordle" ? target.puzzle.category : target.passage.reference.replace(/\s+\d+:.*$/, "") })
    // Un intento atrasado no revive un error resuelto más tarde en otro equipo.
    if (!clock || operation.at > clock.at || operation.at === clock.at && operation.id > clock.id) {
      const prior = account.totals.reviews.find(item => item.key === key)
      account.totals.reviews = updateReview(account.totals.reviews, operation.attempt, day)
      if (operation.mode === "review" && correct && prior && prior.lastSuccess !== day) activity({ kind: "review", game: target.kind, correct: true, mode: operation.mode, title }, ":review")
      account.reviewClocks[key] = { at: operation.at, id: operation.id }
    }
  }
  account.rounds = Object.fromEntries(Object.entries(account.rounds).filter(([, round]) => round.updatedAt >= now - ROUND_LIFETIME_MS).sort(([, a], [, b]) => b.updatedAt - a.updatedAt).slice(0, 12))
  account.closedRounds = Object.fromEntries(Object.entries(account.closedRounds).filter(([, at]) => at >= now - 30 * 86400000))
  account.activity = account.activity.filter(item => item.day >= dateBefore(gameDay(now), 56)).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(-6000)
  account.recentOperations = [...account.recentOperations, operation.id].slice(-2000)
  return account
}

export function parseAccount(value: unknown): AccountProgress {
  const raw = value as AccountProgress
  if (!raw || raw.version !== 3 || !raw.totals || !Array.isArray(raw.activity)) throw new Error("El progreso recibido no es válido.")
  const account = emptyAccount()
  account.totals = parseProgress(JSON.stringify(raw.totals))
  for (const [key, value] of Object.entries(raw.cycles ?? {})) {
    const [length, category] = key.split(":")
    if (filterKey(parseFilters({ length: Number(length) || null, category })) !== key) continue
    const counts = Object.fromEntries(Object.entries(value?.counts ?? {}).filter(([word, count]) => /^[A-ZÑ]{4,7}$/.test(word) && Number.isSafeInteger(count) && count >= 0 && count <= 1000000).slice(-500))
    account.cycles[key] = { counts, last: typeof value?.last === "string" ? value.last.slice(0, 7) : "", floor: Number.isSafeInteger(value?.floor) && value.floor! >= 0 ? value.floor : 0 }
  }
  for (const value of Object.values(raw.rounds ?? {}).slice(0, 12)) {
    try { const round = parseSavedRound(value); account.rounds[round.id] = round } catch { /* Mantiene las demás partidas. */ }
  }
  account.closedRounds = Object.fromEntries(Object.entries(raw.closedRounds ?? {}).filter(([id, at]) => validId(id) && isTime(at)))
  account.reviewClocks = Object.fromEntries(Object.entries(raw.reviewClocks ?? {}).filter(([key, clock]) => /^(wordle|complete|order):/.test(key) && key.length <= 150 && clock && isTime(clock.at) && validId(clock.id)))
  account.recentOperations = Array.isArray(raw.recentOperations) ? raw.recentOperations.filter(validId).slice(-2000) : []
  account.activity = raw.activity.filter(item => item && validId(item.id) && isTime(item.at) && /^\d{4}-\d{2}-\d{2}$/.test(item.day) && isGame(item.game) && ["result", "answer", "review"].includes(item.kind) && ["free", "daily", "review"].includes(item.mode) && typeof item.correct === "boolean")
    .slice(-6000).map(item => ({ id: item.id, at: item.at, day: item.day, game: item.game, kind: item.kind, correct: item.correct, mode: item.mode, score: Number.isSafeInteger(item.score) ? Math.max(0, Math.min(100, item.score!)) : undefined, level: ["initial", "intermediate", "advanced"].includes(item.level ?? "") ? item.level : undefined, title: typeof item.title === "string" ? item.title.slice(0, 120) : undefined, topic: typeof item.topic === "string" ? item.topic.slice(0, 80) : undefined }))
  return account
}
