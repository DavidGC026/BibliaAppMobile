"use client"

import { useEffect, useRef, useState } from "react"
import { createMemoryGame, createVerseQuestions, flipMemoryCard, memoryScore, nextWord, normalizeAnswer, wordScore, type GameVerse } from "./engine"
import type { GameResult } from "./progress"
import type { GameId } from "./content"

export type OnGameComplete = (result: GameResult) => void

const MEMORY_MISMATCH_DELAY_MS = 1500

function useCompletion(game: GameId, finished: boolean, score: number, won: boolean, onComplete: OnGameComplete) {
  const [id] = useState(() => `${game}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const reported = useRef(false)
  useEffect(() => {
    if (!finished || reported.current) return
    reported.current = true
    onComplete({ id, game, score, won })
  }, [finished, game, id, score, won, onComplete])
}

export function useVerseGame(verses: readonly GameVerse[], onComplete: OnGameComplete) {
  const [questions] = useState(() => createVerseQuestions(verses))
  const [answers, setAnswers] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const question = questions[index]
  const answered = answers.length > index
  const finished = questions.length > 0 && index === questions.length
  const correctCount = answers.filter((answer, position) => normalizeAnswer(answer) === normalizeAnswer(questions[position].answer)).length
  const score = questions.length ? Math.round(correctCount / questions.length * 100) : 0
  useCompletion("complete", finished, score, correctCount === questions.length, onComplete)
  return {
    questions, question, answers, index, answered, finished, correctCount, score,
    answer(value: string) {
      if (!question || answered || !value.trim()) return
      setAnswers((current) => current.length === index ? [...current, value.trim()] : current)
    },
    next() { if (answered) setIndex((current) => current === index ? Math.min(current + 1, questions.length) : current) },
  }
}

export function useMemoryGame(pairCount: number, onComplete: OnGameComplete) {
  const [state, setState] = useState(() => createMemoryGame(pairCount))
  const finished = state.matched.length === state.pairs.length
  const score = memoryScore(state.pairs.length, state.attempts)
  const mismatch = state.flipped.length === 2
  useEffect(() => {
    if (!mismatch) return
    const timeout = setTimeout(() => {
      setState((current) => current.flipped === state.flipped ? { ...current, flipped: [] } : current)
    }, MEMORY_MISMATCH_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [mismatch, state.flipped])
  useCompletion("memory", finished, score, true, onComplete)
  return {
    ...state, finished, score, mismatch,
    flip(id: string) { setState((current) => flipMemoryCard(current, id)) },
  }
}

export function useWordGame(onComplete: OnGameComplete) {
  const [puzzle] = useState(() => nextWord())
  const target = normalizeAnswer(puzzle.word)
  const [draft, setDraft] = useState("")
  const [guesses, setGuesses] = useState<string[]>([])
  const [hints, setHints] = useState<number[]>([])
  const [error, setError] = useState("")
  const won = guesses.includes(target)
  const finished = won || guesses.length === 6
  const score = won ? wordScore(guesses.length, hints.length) : 0
  useCompletion("wordle", finished, score, won, onComplete)
  return {
    puzzle, target, draft, guesses, hints, error, won, finished, score,
    edit(value: string) {
      if (finished) return
      setError("")
      setDraft(normalizeAnswer(value).replace(/[^A-ZÑ]/g, "").slice(0, target.length))
    },
    submit() {
      if (finished) return
      if (draft.length !== target.length) { setError(`Escribe ${target.length} letras.`); return }
      if (guesses.includes(draft)) { setError("Ya probaste esa palabra. Intenta otra."); return }
      setGuesses((current) => current.includes(target) || current.length >= 6 || current.includes(draft) ? current : [...current, draft])
      setDraft("")
      setError("")
    },
    reveal() {
      if (finished) return
      const index = [...target].findIndex((letter, position) => !hints.includes(position) && !guesses.some((guess) => guess[position] === letter))
      if (index < 0) return
      setHints((current) => current.includes(index) ? current : [...current, index])
    },
  }
}
