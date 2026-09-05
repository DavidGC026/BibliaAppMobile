"use client"

import { useCallback, useEffect, useState } from "react"
import { normalizeAnswer } from "./engine"
import { parseGameContent, type EditorCatalog, type GameContent } from "./catalog"

export type ContentKind = "words" | "pairs" | "passages"
export interface ContentDraft { word: string; clue: string; category: string; left: string; right: string; bookId: string; chapter: string; verse: string; reference: string }
export const CONTENT_LABELS = { words: "Palabras de Wordle", pairs: "Parejas de memoria", passages: "Versículos" }
export const emptyDraft = (): ContentDraft => ({ word: "", clue: "", category: "Personaje", left: "", right: "", bookId: "1", chapter: "1", verse: "1", reference: "" })
export function contentEntries(content: EditorCatalog, kind: ContentKind) {
  const bookName = (id: number) => content.books.find(book => book.bookId === id)?.name ?? "Libro"
  return content.catalog[kind].map((entry, index) => {
    const title = "word" in entry ? entry.word : "left" in entry ? entry.left : `${bookName(entry.bookId)} ${entry.chapter}:${entry.verse}`
    const detail = "clue" in entry ? entry.clue : "right" in entry ? entry.right : "Completa y ordena este pasaje"
    return { index, title, detail, draft: { ...emptyDraft(), ...entry, bookId: String(entry.bookId), chapter: String(entry.chapter), verse: String(entry.verse), reference: "reference" in entry ? entry.reference : "" } as ContentDraft }
  })
}
export function applyContentDraft(content: EditorCatalog, kind: ContentKind, draft: ContentDraft, editing: number | null): GameContent {
  const book = content.books.find(book => book.bookId === Number(draft.bookId))
  if (!book) throw new Error("Elige un libro del catálogo.")
  const coordinates = { bookId: Number(draft.bookId), chapter: Number(draft.chapter), verse: Number(draft.verse) }
  const reference = draft.reference.trim() || `${book.name} ${coordinates.chapter}:${coordinates.verse}`
  let entry: unknown = coordinates
  if (kind === "words") entry = { ...coordinates, reference, word: draft.word, clue: draft.clue, category: draft.category }
  if (kind === "pairs") entry = { ...coordinates, reference, left: draft.left, right: draft.right, id: editing === null ? `pair-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` : content.catalog.pairs[editing]?.id }
  const entries: unknown[] = [...content.catalog[kind]]
  if (editing === null) entries.push(entry)
  else {
    if (!entries[editing]) throw new Error("La entrada ya no está disponible. Vuelve a seleccionarla.")
    entries[editing] = entry
  }
  return parseGameContent({ ...content.catalog, [kind]: entries })
}
export function useContentEditor(load: () => Promise<EditorCatalog>, save: (catalog: GameContent, revision: number) => Promise<{ catalog: GameContent; revision: number }>) {
  const [content, setContent] = useState<EditorCatalog | null>(null)
  const [kind, setKind] = useState<ContentKind>("words")
  const [draft, setDraft] = useState(emptyDraft)
  const [editing, setEditing] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [preview, setPreview] = useState<GameContent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const reload = useCallback(async () => {
    setBusy(true); setError("")
    try { const next = await load(); setContent({ ...next, catalog: parseGameContent(next.catalog) }); setPreview(null); setEditing(null) }
    catch (error) { setError((error as Error).message) }
    finally { setBusy(false) }
  }, [load])
  useEffect(() => { void reload() }, [reload])
  const entries = content ? contentEntries(content, kind).filter(entry => normalizeAnswer(`${entry.title} ${entry.detail}`).includes(normalizeAnswer(search))) : []
  return {
    content, kind, draft, editing, search, setSearch, preview, busy, error, notice, entries, reload,
    chooseKind(next: ContentKind) { setKind(next); setDraft(emptyDraft()); setEditing(null); setPreview(null); setError(""); setNotice(""); setSearch("") },
    edit(index: number) { if (content) { setDraft(contentEntries(content, kind)[index].draft); setEditing(index); setPreview(null); setError(""); setNotice("") } },
    change(field: keyof ContentDraft, value: string) { setDraft(current => ({ ...current, [field]: value })); setPreview(null); setNotice("") },
    prepare() {
      if (!content) return
      try { setPreview(applyContentDraft(content, kind, draft, editing)); setError("") }
      catch (error) { setError((error as Error).message); setPreview(null) }
    },
    async publish() {
      if (!content || !preview || busy) return
      setBusy(true); setError("")
      try {
        const saved = await save(preview, content.revision)
        setContent({ ...content, ...saved }); setPreview(null); setDraft(emptyDraft()); setEditing(null)
        setNotice("Contenido publicado. Estará disponible al actualizar los juegos en web y móvil; el reto de hoy conserva su contenido.")
      } catch (error) { setError((error as Error).message) }
      finally { setBusy(false) }
    },
  }
}
