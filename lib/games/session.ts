"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { GameId } from "./content"
import { DEFAULT_CONTENT, gameDay, parseCoordinates, parseGameContent, parsePair, parseWord, selectUnseenWord, type ContentEnvelope } from "./catalog"
import { emptyProgress, parseProgress, recordResult, type GameResult, type GamesProgress } from "./progress"
import { updateReview, type ReviewAttempt, type ReviewTarget } from "./review"
import type { RoundSettings } from "./round"

export interface GameStorage { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<unknown> }
interface SessionOptions { storage: GameStorage; storageKey: string; legacyKey: string; loadContent(): Promise<ContentEnvelope> }
export interface ActiveRound { id: number; game: GameId; settings: RoundSettings }
export function parseContentEnvelope(value: unknown): ContentEnvelope {
  const row = value as ContentEnvelope
  if (!row || !Number.isSafeInteger(row.revision) || row.revision < 1 || !Number.isFinite(row.serverTime) || !/^\d{4}-\d{2}-\d{2}$/.test(row.daily?.date) || row.daily.pairs.length !== 6 || row.daily.passages.length !== 5) throw new Error("El catálogo recibido no es válido.")
  return { revision: row.revision, serverTime: row.serverTime, catalog: parseGameContent(row.catalog), daily: { date: row.daily.date, word: parseWord(row.daily.word), pairs: row.daily.pairs.map(parsePair), passages: row.daily.passages.map(parseCoordinates) } }
}
export function useGamesSession({ storage, storageKey, legacyKey, loadContent }: SessionOptions) {
  const [progress, setProgress] = useState(emptyProgress)
  const progressRef = useRef(progress)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [envelope, setEnvelope] = useState<ContentEnvelope | null>(null)
  const [contentError, setContentError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [active, setActive] = useState<ActiveRound | null>(null)
  const nextId = useRef(0)
  const writes = useRef(Promise.resolve())
  const requestId = useRef(0)
  const mounted = useRef(false)
  const clockOffset = useRef(0)
  const [today, setToday] = useState(() => gameDay())

  const persist = useCallback((next: GamesProgress) => {
    progressRef.current = next
    setProgress(next)
    writes.current = writes.current.then(async () => { await storage.set(storageKey, JSON.stringify(next)) })
      .catch(() => { if (mounted.current) setStorageError(true) })
  }, [storage, storageKey])
  const refresh = useCallback(async () => {
    const request = ++requestId.current
    setRefreshing(true)
    try {
      const content = parseContentEnvelope(await loadContent())
      if (!mounted.current || request !== requestId.current) return
      clockOffset.current = content.serverTime - Date.now()
      setToday(gameDay(content.serverTime))
      setEnvelope(content)
      setContentError("")
      await storage.set("games-content-v1", JSON.stringify(content)).catch(() => {})
    } catch {
      if (mounted.current && request === requestId.current) setContentError("No se pudo actualizar el contenido. Puedes jugar con el catálogo guardado y volver a intentarlo.")
    } finally { if (mounted.current && request === requestId.current) setRefreshing(false) }
  }, [loadContent, storage])

  useEffect(() => {
    let alive = true
    mounted.current = true
    Promise.all([storage.get(storageKey).then(raw => raw ?? storage.get(legacyKey)), storage.get("games-content-v1").catch(() => null)])
      .then(([raw, cached]) => {
        if (!alive) return
        progressRef.current = parseProgress(raw)
        setProgress(progressRef.current)
        if (cached) { try { setEnvelope(parseContentEnvelope(JSON.parse(cached))) } catch { /* Usa el catálogo incluido. */ } }
      })
      .catch(() => { if (alive) setStorageError(true) })
      .finally(() => { if (alive) { setReady(true); void refresh() } })
    const timer = setInterval(() => setToday(gameDay(Date.now() + clockOffset.current)), 30000)
    return () => { alive = false; mounted.current = false; clearInterval(timer) }
  }, [storage, storageKey, legacyKey, refresh])
  useEffect(() => { if (ready && envelope && envelope.daily.date !== today) void refresh() }, [today, ready, refresh, envelope?.daily.date])

  const start = useCallback((game: GameId, mode: RoundSettings["mode"] = "free", review?: ReviewTarget) => {
    if (!ready) return
    const date = gameDay(Date.now() + clockOffset.current)
    if (mode === "daily" && envelope?.daily.date !== date) { setContentError("Conéctate y actualiza el reto de hoy para comenzar."); void refresh(); return }
    const catalog = envelope?.catalog ?? DEFAULT_CONTENT
    const settings: RoundSettings = { mode, seed: mode === "daily" ? `daily:${date}` : `${Date.now()}:${Math.random()}`, review }
    if (mode === "daily") {
      settings.dailyDate = date; settings.word = envelope!.daily.word; settings.pairs = envelope!.daily.pairs
    } else {
      settings.pairs = catalog.pairs
      if (review?.kind === "wordle") settings.word = review.puzzle
      else if (game === "wordle") {
        const next = selectUnseenWord(catalog.words, progressRef.current.wordCycle)
        settings.word = next.puzzle
        persist({ ...progressRef.current, wordCycle: next.seen })
      }
    }
    setActive({ id: ++nextId.current, game, settings })
  }, [ready, envelope, persist, refresh])
  const restart = useCallback(() => { if (active) start(active.game, active.settings.mode, active.settings.review) }, [active, start])
  const onComplete = useCallback((result: GameResult) => {
    const dailyKey = active?.settings.dailyDate ? `${active.settings.dailyDate}:${result.game}` : undefined
    persist(recordResult(progressRef.current, { ...result, dailyKey }))
  }, [active, persist])
  const onAttempt = useCallback((attempt: ReviewAttempt) => {
    persist({ ...progressRef.current, reviews: updateReview(progressRef.current.reviews, attempt, gameDay(Date.now() + clockOffset.current)) })
  }, [persist])
  return {
    progress, ready, storageError, contentError, refreshing, refresh, active, start, restart, onComplete, onAttempt, today,
    back() { setActive(null) },
    catalog: envelope?.catalog ?? DEFAULT_CONTENT,
    dailyAvailable: envelope?.daily.date === today,
    reviews: [...progress.reviews].sort((a, b) => a.due.localeCompare(b.due)),
  }
}
