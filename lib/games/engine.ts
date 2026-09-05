import { MEMORY_PAIRS, WORD_PUZZLES, type MemoryPair, type WordPuzzle } from "./content"

export function normalizeAnswer(value: string): string {
  // Ñ es una letra distinta; las tildes y la diéresis no cambian la respuesta.
  return value.trim().toUpperCase().normalize("NFC")
    .replace(/[ÁÀÂÄ]/g, "A").replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I").replace(/[ÓÒÔÖ]/g, "O").replace(/[ÚÙÛÜ]/g, "U")
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }
  return shuffled
}

export type LetterState = "correct" | "present" | "absent"
export const LETTER_LABELS: Record<LetterState, string> = {
  correct: "posición correcta", present: "otra posición", absent: "no aparece",
}

export function gradeGuess(guess: string, answer: string): LetterState[] {
  const letters = [...normalizeAnswer(guess)]
  const target = [...normalizeAnswer(answer)]
  if (letters.length !== target.length) throw new Error("La palabra tiene otra longitud.")
  const grades: LetterState[] = letters.map(() => "absent")
  const remaining = new Map<string, number>()
  target.forEach((letter, index) => {
    if (letters[index] === letter) grades[index] = "correct"
    else remaining.set(letter, (remaining.get(letter) ?? 0) + 1)
  })
  letters.forEach((letter, index) => {
    if (grades[index] === "correct" || !remaining.get(letter)) return
    grades[index] = "present"
    remaining.set(letter, remaining.get(letter)! - 1)
  })
  return grades
}

export function keyboardGrades(guesses: readonly string[], answer: string): Record<string, LetterState> {
  const ranks = { absent: 0, present: 1, correct: 2 }
  const keys: Record<string, LetterState> = {}
  guesses.forEach((guess) => gradeGuess(guess, answer).forEach((grade, index) => {
    const letter = normalizeAnswer(guess)[index]
    if (!keys[letter] || ranks[grade] > ranks[keys[letter]]) keys[letter] = grade
  }))
  return keys
}

export function nextWord(previous?: string): WordPuzzle {
  return shuffle(WORD_PUZZLES.filter((puzzle) => puzzle.word !== previous))[0]
}

export interface GameVerse {
  id: number
  bookId: number
  bookName: string
  chapter: number
  verse: number
  text: string
}

export interface VerseQuestion {
  verse: GameVerse
  before: string
  after: string
  answer: string
  options: string[]
}

const SKIP_WORDS = new Set(["PARA", "COMO", "PERO", "PORQUE", "ESTE", "ESTA", "ESTOS", "ESTAS", "AQUEL", "TODAS", "TODOS", "TODO", "TODA", "SOBRE", "ENTRE", "CUANDO", "VUESTRO", "VUESTRA"])

function candidateWords(text: string) {
  return [...text.matchAll(/[\p{L}\p{M}]+/gu)]
    .filter((match) => match[0].length >= 4 && !SKIP_WORDS.has(normalizeAnswer(match[0])))
}

export function createVerseQuestions(verses: readonly GameVerse[], count = 5): VerseQuestion[] {
  const candidates = verses.filter((verse) => candidateWords(verse.text).length > 0)
  const vocabulary = new Map<string, string>()
  candidates.forEach((verse) => candidateWords(verse.text).forEach(([word]) => {
    vocabulary.set(normalizeAnswer(word), word)
  }))
  if (vocabulary.size < 4) return []
  const unique = [...new Map(candidates.map((verse) => [`${verse.bookId}:${verse.chapter}:${verse.verse}`, verse])).values()]
  return shuffle(unique).slice(0, count).map((verse) => {
    const match = shuffle(candidateWords(verse.text))[0]
    const answer = match[0]
    const start = match.index!
    const alternatives = shuffle([...vocabulary.entries()]
      .filter(([normalized]) => normalized !== normalizeAnswer(answer)))
      .slice(0, 3).map(([, word]) => word)
    return {
      verse, before: verse.text.slice(0, start), after: verse.text.slice(start + answer.length),
      answer, options: shuffle([answer, ...alternatives]),
    }
  })
}

export interface MemoryCard {
  id: string
  pairId: string
  text: string
}

export interface MemoryState {
  pairs: MemoryPair[]
  cards: MemoryCard[]
  flipped: string[]
  matched: string[]
  attempts: number
}

export function createMemoryGame(pairCount: number): MemoryState {
  const pairs = shuffle(MEMORY_PAIRS).slice(0, Math.min(8, Math.max(4, pairCount)))
  const cards = shuffle(pairs.flatMap((pair) => [
    { id: `${pair.id}-left`, pairId: pair.id, text: pair.left },
    { id: `${pair.id}-right`, pairId: pair.id, text: pair.right },
  ]))
  return { pairs, cards, flipped: [], matched: [], attempts: 0 }
}

export function flipMemoryCard(state: MemoryState, cardId: string): MemoryState {
  const card = state.cards.find((candidate) => candidate.id === cardId)
  if (!card || state.flipped.length === 2 || state.flipped.includes(cardId) || state.matched.includes(card.pairId)) return state
  const flipped = [...state.flipped, cardId]
  if (flipped.length === 1) return { ...state, flipped }
  const first = state.cards.find((candidate) => candidate.id === flipped[0])!
  const matched = first.pairId === card.pairId ? [...state.matched, card.pairId] : state.matched
  return { ...state, flipped: matched !== state.matched ? [] : flipped, matched, attempts: state.attempts + 1 }
}

export function memoryScore(pairCount: number, attempts: number): number {
  return Math.max(20, 100 - Math.max(0, attempts - pairCount) * 5)
}

export function wordScore(attempts: number, hints: number): number {
  return Math.max(10, 110 - attempts * 10 - hints * 15)
}
