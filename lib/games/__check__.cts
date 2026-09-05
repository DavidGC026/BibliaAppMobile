import assert from "node:assert/strict"
import { COMPLETION_PASSAGES, MEMORY_PAIRS, WORD_PUZZLES } from "./content"
import { createMemoryGame, createVerseQuestions, flipMemoryCard, gradeGuess, keyboardGrades, memoryScore, normalizeAnswer, shuffle, wordScore, type GameVerse } from "./engine"
import { emptyProgress, parseProgress, recordResult } from "./progress"

assert.equal(normalizeAnswer("  Moise\u0301s "), "MOISES")
assert.equal(normalizeAnswer("señor pingüino"), "SEÑOR PINGUINO")
assert.notEqual(normalizeAnswer("año"), normalizeAnswer("ano"))
assert.deepEqual(gradeGuess("SARA", "SARA"), ["correct", "correct", "correct", "correct"])
assert.deepEqual(gradeGuess("AAAA", "SARA"), ["absent", "correct", "absent", "correct"])
assert.deepEqual(gradeGuess("ALAS", "SARA"), ["present", "absent", "present", "present"])
assert.deepEqual(gradeGuess("NIÑA", "MANÁ"), ["present", "absent", "absent", "correct"])
assert.throws(() => gradeGuess("FE", "ARCA"))
assert.equal(keyboardGrades(["ARCA", "XXXX"], "ARCA").A, "correct")
assert.equal(keyboardGrades(["ARCA", "AAAA"], "SARA").A, "correct")

const originals = [1, 2, 3, 4]
assert.deepEqual([...shuffle(originals)].sort(), originals)
assert.deepEqual(originals, [1, 2, 3, 4])
assert.deepEqual(shuffle([], () => 0), [])

// Fixtures sintéticas: comprueban selección de huecos sin fijar una traducción.
const verses: GameVerse[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1, bookId: 19, bookName: "Salmos", chapter: 1, verse: index + 1,
  text: `«Palabra${index}»; camino, esperanza y alegría.`,
}))
for (let iteration = 0; iteration < 50; iteration++) {
  const questions = createVerseQuestions([...verses, verses[0]])
  assert.equal(questions.length, 5)
  assert.equal(new Set(questions.map((question) => question.verse.id)).size, 5)
  for (const question of questions) {
    assert.equal(question.before + question.answer + question.after, question.verse.text)
    assert.equal(question.options.length, 4)
    assert.equal(new Set(question.options.map(normalizeAnswer)).size, 4)
    assert.equal(question.options.filter((option) => normalizeAnswer(option) === normalizeAnswer(question.answer)).length, 1)
  }
}
assert.deepEqual(createVerseQuestions([]), [])
assert.deepEqual(createVerseQuestions([{ ...verses[0], text: "a y de" }]), [])

let memory = createMemoryGame(6)
assert.equal(memory.cards.length, 12)
assert.equal(new Set(memory.cards.map((card) => card.id)).size, 12)
for (const pair of memory.pairs) assert.equal(memory.cards.filter((card) => card.pairId === pair.id).length, 2)
const first = memory.cards[0]
const partner = memory.cards.find((card) => card.pairId === first.pairId && card.id !== first.id)!
const other = memory.cards.find((card) => card.pairId !== first.pairId)!
assert.equal(flipMemoryCard(memory, "missing"), memory)
memory = flipMemoryCard(memory, first.id)
assert.equal(flipMemoryCard(memory, first.id), memory)
memory = flipMemoryCard(memory, other.id)
assert.equal(memory.attempts, 1)
assert.equal(memory.matched.length, 0)
assert.equal(flipMemoryCard(memory, partner.id), memory)
memory = { ...memory, flipped: [] }
memory = flipMemoryCard(flipMemoryCard(memory, first.id), partner.id)
assert.equal(memory.attempts, 2)
assert.deepEqual(memory.matched, [first.pairId])
assert.equal(flipMemoryCard(memory, first.id), memory)
for (const pair of memory.pairs.filter((pair) => pair.id !== first.pairId)) {
  const cards = memory.cards.filter((card) => card.pairId === pair.id)
  memory = flipMemoryCard(flipMemoryCard(memory, cards[0].id), cards[1].id)
}
assert.equal(memory.matched.length, 6)
assert.equal(memoryScore(6, 6), 100)
assert.equal(memoryScore(6, 1000), 20)
assert.equal(wordScore(1, 0), 100)
assert.equal(wordScore(6, 6), 10)

const empty = emptyProgress()
const result = { id: "round-1", game: "wordle" as const, score: 90, won: true }
const progress = recordResult(empty, result)
assert.equal(empty.games.wordle.played, 0)
assert.deepEqual(progress.games.wordle, { played: 1, won: 1, best: 90, points: 90 })
assert.equal(recordResult(progress, result), progress)
assert.deepEqual(parseProgress(JSON.stringify(progress)), progress)
assert.deepEqual(parseProgress("{bad json"), emptyProgress())
assert.deepEqual(parseProgress('{"version":1,"games":{"wordle":{"played":-3}}}'), emptyProgress())
assert.deepEqual(parseProgress('{"version":2}'), emptyProgress())

assert.equal(new Set(MEMORY_PAIRS.map((pair) => pair.id)).size, MEMORY_PAIRS.length)
assert.equal(new Set(MEMORY_PAIRS.map((pair) => pair.left)).size, MEMORY_PAIRS.length)
assert.equal(new Set(MEMORY_PAIRS.map((pair) => pair.right)).size, MEMORY_PAIRS.length)
assert.equal(new Set(WORD_PUZZLES.map((puzzle) => normalizeAnswer(puzzle.word))).size, WORD_PUZZLES.length)
assert.ok(WORD_PUZZLES.length >= 50, "Wordle debe ofrecer al menos 50 palabras")
for (const puzzle of WORD_PUZZLES) {
  assert.match(normalizeAnswer(puzzle.word), /^[A-ZÑ]{4,7}$/)
  assert.ok(puzzle.clue.trim().length > 0, `Falta la pista de ${puzzle.word}`)
}
for (const passage of [...WORD_PUZZLES, ...MEMORY_PAIRS]) {
  assert.ok(passage.reference.trim().length > 0)
  for (const value of [passage.bookId, passage.chapter, passage.verse]) assert.ok(Number.isSafeInteger(value) && value > 0)
}
assert.equal(new Set(COMPLETION_PASSAGES.map((passage) => passage.join(":"))).size, COMPLETION_PASSAGES.length)
for (const passage of COMPLETION_PASSAGES) {
  for (const value of passage) assert.ok(Number.isSafeInteger(value) && value > 0)
}
console.log("Juegos: letras repetidas, tildes, preguntas, memoria, puntuaciones y persistencia verificados.")
