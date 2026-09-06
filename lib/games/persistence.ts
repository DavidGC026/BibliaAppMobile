"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { parseProgress } from "./progress"
import { applyOperation, emptyAccount, parseAccount, parseOperation, type AccountProgress, type ProgressOperation, type ProgressSyncReply } from "./sync"

export interface GameStorage { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<unknown> }
export type SyncGames = (accountId: number, operations: ProgressOperation[]) => Promise<ProgressSyncReply>
interface Journal { version: 3; account: AccountProgress; pending: ProgressOperation[] }
export function operationId() { return `games-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
export function parseJournal(raw: string): Journal {
  const stored = JSON.parse(raw)
  if (stored?.version !== 3 || !Array.isArray(stored.pending)) throw new Error("El guardado local no es válido.")
  return { version: 3, account: parseAccount(stored.account), pending: stored.pending.map(parseOperation) }
}
export function synchronizationBatch(pending: readonly ProgressOperation[]) {
  const batch: ProgressOperation[] = []
  let length = 0
  for (const operation of pending.slice(0, 100)) {
    const size = JSON.stringify(operation).length + 1
    if (batch.length && length + size > 500000) break
    batch.push(operation); length += size
  }
  return batch
}
export function acknowledgeJournal(journal: Journal, response: ProgressSyncReply, now = Date.now()): Journal {
  const acknowledged = new Set(response.acknowledged)
  const pending = journal.pending.filter(operation => !acknowledged.has(operation.id))
  let account = parseAccount(response.progress)
  for (const operation of pending) account = applyOperation(account, operation, now)
  return { version: 3, account, pending }
}
export function useProgressPersistence({ storage, storageKey, legacyKey, userId, synchronize }: {
  storage: GameStorage; storageKey: string; legacyKey: string; userId?: number; synchronize: SyncGames
}) {
  const journalKey = storageKey.replace("v2-", "v3-")
  const [journal, setJournal] = useState<Journal>({ version: 3, account: emptyAccount(), pending: [] })
  const reference = useRef(journal)
  const alive = useRef(false)
  const writes = useRef(Promise.resolve(true))
  const readFailed = useRef(false)
  const working = useRef(false)
  const clockOffset = useRef(0)
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [syncError, setSyncError] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const persist = useCallback((next: Journal) => {
    writes.current = writes.current.then(async () => {
      // No reemplaza un historial que no se pudo leer por uno vacío.
      if (readFailed.current) return false
      try {
        await storage.set(journalKey, JSON.stringify(next))
        if (alive.current) setStorageError(false)
        return true
      } catch {
        if (alive.current) setStorageError(true)
        return false
      }
    })
    return writes.current
  }, [storage, journalKey])
  const store = useCallback((next: Journal) => {
    reference.current = next
    if (alive.current) setJournal(next)
    void persist(next)
  }, [persist])
  useEffect(() => {
    let mounted = true
    alive.current = true
    const read = async () => {
      try {
        const saved = await storage.get(journalKey)
        if (saved) {
          const next = parseJournal(saved)
          if (mounted) { reference.current = next; setJournal(next) }
        } else {
          const legacy = await storage.get(storageKey) ?? await storage.get(legacyKey)
          const operation: ProgressOperation = { id: operationId(), at: Date.now(), type: "import", progress: parseProgress(legacy) }
          const next: Journal = { version: 3, account: applyOperation(emptyAccount(), operation), pending: userId ? [operation] : [] }
          // La identidad de la importación queda en disco antes de enviarla.
          if (mounted) { store(next); await writes.current }
        }
      } catch { if (mounted) { readFailed.current = true; setStorageError(true) } }
      finally { if (mounted) setReady(true) }
    }
    void read()
    return () => { mounted = false; alive.current = false }
  }, [storage, storageKey, legacyKey, journalKey, userId, store])
  const sync = useCallback(async () => {
    if (!userId || !ready || working.current || !alive.current || readFailed.current) return
    working.current = true
    setSyncing(true)
    try {
      if (!await writes.current && !await persist(reference.current)) throw new Error("No se pudo guardar el historial local.")
      if (!alive.current) return
      do {
        const batch = synchronizationBatch(reference.current.pending)
        const response = await synchronize(userId, batch)
        if (!alive.current) return
        if (!Array.isArray(response.acknowledged) || batch.some(operation => !response.acknowledged.includes(operation.id)) || !Number.isFinite(response.serverTime)) throw new Error("No se confirmó el guardado.")
        clockOffset.current = response.serverTime - Date.now()
        store(acknowledgeJournal(reference.current, response))
        if (!await writes.current) throw new Error("No se pudo guardar la confirmación.")
        setLastSync(Date.now()); setSyncError("")
      } while (reference.current.pending.length && alive.current)
    } catch {
      if (alive.current) setSyncError("No se pudo sincronizar. Se volverá a intentar; revisa tu conexión y el espacio disponible.")
    } finally {
      working.current = false
      if (alive.current) setSyncing(false)
    }
  }, [userId, ready, synchronize, store, persist])
  useEffect(() => {
    if (!ready || !userId) return
    const timer = setTimeout(() => void sync(), journal.pending.length ? 1000 : 0)
    return () => clearTimeout(timer)
  }, [ready, userId, journal.pending.length, sync])
  useEffect(() => {
    if (!ready || !userId) return
    const interval = setInterval(() => void sync(), 30000)
    return () => clearInterval(interval)
  }, [ready, userId, sync])
  const dispatch = useCallback((operation: ProgressOperation) => {
    const current = reference.current
    if (current.account.recentOperations.includes(operation.id)) return
    // Solo hace falta enviar el último borrador pendiente de cada partida.
    const pending = operation.type === "save" ? current.pending.filter(item => item.type !== "save" || item.round.id !== operation.round.id) : current.pending
    store({ version: 3, account: applyOperation(current.account, operation), pending: userId ? [...pending, operation] : [] })
  }, [store, userId])
  return { account: journal.account, accountRef: reference, dispatch, ready, storageError, syncError, syncing, lastSync, pending: journal.pending.length, sync, now: () => Date.now() + clockOffset.current }
}
