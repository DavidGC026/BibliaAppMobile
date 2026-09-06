"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GameId } from "./content"
import { DEFAULT_CONTENT, gameDay, parseCoordinates, parseGameContent, parsePair, parseWord, seededRandom, type ContentEnvelope } from "./catalog"
import { shuffle } from "./engine"
import type { GameResult } from "./progress"
import type { ReviewAttempt, ReviewTarget } from "./review"
import type { RoundSettings } from "./round"
import type { RoundCheckpoint, SavedRound } from "./saved-round"
import { ROUND_LIFETIME_MS } from "./saved-round"
import { operationId, useProgressPersistence, type GameStorage, type SyncGames } from "./persistence"
import { automaticLevel, chooseFilteredWord, defaultFilters, filterKey, filterWords, parseFilters, weeklySummary, type LevelChoice, type WordFilters } from "./training"
export type { GameStorage } from "./persistence"

interface SessionOptions {
  storage: GameStorage; storageKey: string; legacyKey: string; userId?: number
  loadContent(): Promise<ContentEnvelope>; synchronize: SyncGames
}
export interface ActiveRound extends SavedRound { mountKey: string }
export type GamesSession = ReturnType<typeof useGamesSession>
export function parseContentEnvelope(value: unknown): ContentEnvelope {
  const row = value as ContentEnvelope
  if (!row || !Number.isSafeInteger(row.revision) || row.revision < 1 || !Number.isFinite(row.serverTime) || !/^\d{4}-\d{2}-\d{2}$/.test(row.daily?.date) || !Array.isArray(row.daily.pairs) || row.daily.pairs.length !== 6 || !Array.isArray(row.daily.passages) || row.daily.passages.length !== 5) throw new Error("El catálogo recibido no es válido.")
  return { revision: row.revision, serverTime: row.serverTime, catalog: parseGameContent(row.catalog), daily: { date: row.daily.date, word: parseWord(row.daily.word), pairs: row.daily.pairs.map(parsePair), passages: row.daily.passages.map(parseCoordinates) } }
}
export function useGamesSession({ storage, storageKey, legacyKey, userId, loadContent, synchronize }: SessionOptions) {
  const persistence = useProgressPersistence({ storage, storageKey, legacyKey, userId, synchronize })
  const [envelope, setEnvelope] = useState<ContentEnvelope | null>(null)
  const [contentError, setContentError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [active, setActive] = useState<ActiveRound | null>(null)
  const activeRef = useRef(active)
  const [filters, setFilters] = useState(defaultFilters)
  const [levelChoice, setLevelChoice] = useState<LevelChoice>("auto")
  const requestId = useRef(0)
  const mounted = useRef(false)
  const clockOffset = useRef(0)
  const [today, setToday] = useState(() => gameDay())
  const catalog = envelope?.catalog ?? DEFAULT_CONTENT
  const availableWords = filterWords(catalog.words, filters)
  const activate = (round: ActiveRound | null) => { activeRef.current = round; setActive(round) }

  const refresh = useCallback(async () => {
    const request = ++requestId.current
    setRefreshing(true)
    try {
      const content = parseContentEnvelope(await loadContent())
      if (!mounted.current || request !== requestId.current) return
      clockOffset.current = content.serverTime - Date.now()
      setToday(gameDay(content.serverTime)); setEnvelope(content); setContentError("")
      await storage.set("games-content-v1", JSON.stringify(content)).catch(() => {})
    } catch {
      if (mounted.current && request === requestId.current) setContentError("No se pudo actualizar el contenido. Puedes jugar con el catálogo guardado y volver a intentarlo.")
    } finally { if (mounted.current && request === requestId.current) setRefreshing(false) }
  }, [loadContent, storage])
  useEffect(() => {
    let alive = true
    mounted.current = true
    void storage.get("games-content-v1").then(cached => {
      if (alive && cached) { try { setEnvelope(parseContentEnvelope(JSON.parse(cached))) } catch { /* Usa el contenido incluido. */ } }
    }).catch(() => {}).finally(() => { if (alive) void refresh() })
    void storage.get(`${storageKey}-options`).then(raw => {
      if (!alive || !raw) return
      try { const options = JSON.parse(raw); setFilters(parseFilters(options.filters)); if (["auto", "initial", "intermediate", "advanced"].includes(options.level)) setLevelChoice(options.level) } catch { /* Conserva opciones iniciales. */ }
    }).catch(() => {})
    const timer = setInterval(() => setToday(gameDay(Date.now() + clockOffset.current)), 30000)
    return () => { alive = false; mounted.current = false; clearInterval(timer) }
  }, [storage, storageKey, refresh])
  useEffect(() => { if (persistence.ready && envelope && envelope.daily.date !== today) void refresh() }, [today, persistence.ready, refresh, envelope?.daily.date])
  const changeOptions = (nextFilters: WordFilters, nextLevel: LevelChoice) => {
    setFilters(nextFilters); setLevelChoice(nextLevel)
    void storage.set(`${storageKey}-options`, JSON.stringify({ filters: nextFilters, level: nextLevel })).catch(() => {})
  }
  const levelFor = (game: GameId) => levelChoice === "auto" ? automaticLevel(persistence.account.activity, game) : levelChoice
  const start = (game: GameId, mode: RoundSettings["mode"] = "free", review?: ReviewTarget) => {
    if (!persistence.ready) return
    const now = persistence.now(), date = gameDay(Date.now() + clockOffset.current)
    if (mode === "daily" && envelope?.daily.date !== date) { setContentError("Conéctate y actualiza el reto de hoy para comenzar."); void refresh(); return }
    const id = operationId()
    const settings: RoundSettings = { mode, seed: mode === "daily" ? `daily:${date}` : id, review }
    let wordUse: { filters: WordFilters; count: number; pool: string[] } | undefined
    if (mode === "daily") {
      settings.dailyDate = date
      if (game === "wordle") settings.word = envelope!.daily.word
      if (game === "memory") settings.pairs = envelope!.daily.pairs
    } else {
      if (game === "memory") settings.pairs = shuffle(catalog.pairs, seededRandom(`${id}:pool`)).slice(0, 8)
      if (review?.kind === "wordle") settings.word = review.puzzle
      else if (game === "wordle") {
        try {
          const next = chooseFilteredWord(availableWords, persistence.accountRef.current.account.cycles[filterKey(filters)])
          settings.word = next.puzzle; wordUse = { filters, count: next.count, pool: next.pool }
        } catch (error) { setContentError((error as Error).message); return }
      }
      if (mode === "free" && (game === "complete" || game === "order")) settings.level = levelFor(game)
    }
    const round: SavedRound = { id, game, settings, checkpoint: {}, createdAt: now, updatedAt: now }
    persistence.dispatch({ id: `start:${id}`, at: now, type: "start", round, wordUse })
    activate({ ...round, mountKey: id }); setContentError("")
  }
  const discard = (id: string) => persistence.dispatch({ id: `discard:${id}`, at: persistence.now(), type: "discard", roundId: id })
  const restart = () => {
    if (!active) return
    discard(active.id)
    start(active.game, active.settings.mode, active.settings.review)
  }
  const onCheckpoint = useCallback((checkpoint: RoundCheckpoint) => {
    const round = activeRef.current
    if (!round || round.id !== active?.id || persistence.accountRef.current.account.closedRounds[round.id]) return
    const combined = { ...round.checkpoint, ...checkpoint }
    if (JSON.stringify(round.checkpoint) === JSON.stringify(combined)) return
    const saved = { ...round, checkpoint: combined, updatedAt: persistence.now() }
    activeRef.current = saved; setActive(saved)
    persistence.dispatch({ id: operationId(), at: saved.updatedAt, type: "save", round: saved })
  }, [active?.id, persistence.dispatch])
  const onComplete = (result: GameResult) => {
    const round = activeRef.current
    if (!round) return
    const dailyKey = round.settings.dailyDate ? `${round.settings.dailyDate}:${result.game}` : undefined
    persistence.dispatch({ id: `result:${round.id}`, at: persistence.now(), type: "result", roundId: round.id, result: { ...result, id: `result:${round.id}`, dailyKey }, mode: round.settings.mode, level: round.settings.level, word: round.settings.word?.word })
  }
  const onAttempt = (attempt: ReviewAttempt) => {
    const round = activeRef.current
    if (!round) return
    persistence.dispatch({ id: `${round.id}:attempt:${attempt.id ?? "word"}`, at: persistence.now(), type: "attempt", roundId: round.id, attempt, mode: round.settings.mode })
  }
  return {
    progress: persistence.account.totals, ready: persistence.ready, storageError: persistence.storageError,
    sync: persistence.sync, syncing: persistence.syncing, syncError: persistence.syncError, lastSync: persistence.lastSync, pending: persistence.pending,
    contentError, refreshing, refresh, active, start, restart, onComplete, onAttempt, onCheckpoint, today, catalog,
    filters, availableWords: availableWords.length, levelChoice, levelFor,
    changeFilters(next: WordFilters) { changeOptions(next, levelChoice) },
    changeLevel(next: LevelChoice) { changeOptions(filters, next) },
    back() { activate(null) }, discard,
    resume(round: SavedRound) { activate({ ...round, mountKey: `${round.id}:${operationId()}` }) },
    savedRounds: Object.values(persistence.account.rounds).filter(round => round.updatedAt >= Date.now() - ROUND_LIFETIME_MS).sort((a, b) => b.updatedAt - a.updatedAt),
    dailyAvailable: envelope?.daily.date === today,
    reviews: [...persistence.account.totals.reviews].sort((a, b) => a.due.localeCompare(b.due)),
    week: weeklySummary(persistence.account.activity, persistence.account.totals.reviews, today),
  }
}
