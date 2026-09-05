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

// El contenido y el historial deben comportarse igual en los dos clientes.
const catalogTools = require('./catalog') as typeof import('./catalog')
const reviewTools = require('./review') as typeof import('./review')
const editorTools = require('./editor') as typeof import('./editor')
const orderTools = require('./engine') as typeof import('./engine')
const { DEFAULT_CONTENT, parseGameContent, selectUnseenWord, seededRandom, createDailyChallenge, gameDay } = catalogTools
assert.deepEqual(parseGameContent(DEFAULT_CONTENT), DEFAULT_CONTENT)
assert.throws(() => parseGameContent({ ...DEFAULT_CONTENT, words: [...WORD_PUZZLES, { ...WORD_PUZZLES[6], word: 'moises' }] }), /repetid/)
assert.throws(() => parseGameContent({ ...DEFAULT_CONTENT, pairs: MEMORY_PAIRS.slice(0, 4) }))
assert.throws(() => parseGameContent({ ...DEFAULT_CONTENT, passages: [{ bookId: 1, chapter: 1, verse: 0 }, ...DEFAULT_CONTENT.passages] }))
let cycle: string[] = []
let lastWord = ''
for (let round = 0; round < 3; round++) {
  const seenThisCycle = new Set<string>()
  for (let index = 0; index < 50; index++) {
    const selection = selectUnseenWord(WORD_PUZZLES, cycle, seededRandom(`cycle:${round}:${index}`))
    const normalized = normalizeAnswer(selection.puzzle.word)
    assert.ok(!seenThisCycle.has(normalized), 'No debe repetir palabras dentro del ciclo')
    assert.notEqual(normalized, lastWord, 'No debe repetir al cambiar de ciclo')
    seenThisCycle.add(normalized); cycle = selection.seen; lastWord = normalized
  }
  assert.equal(seenThisCycle.size, 50)
}
const addedWord = { word: 'ABRAHAM', clue: 'Recibió un nuevo nombre.', category: 'Personaje' as const, bookId: 1, chapter: 17, verse: 5, reference: 'Génesis 17:5' }
assert.equal(selectUnseenWord([...WORD_PUZZLES, addedWord], cycle).puzzle.word, 'ABRAHAM')
assert.equal(selectUnseenWord([WORD_PUZZLES[0]], [normalizeAnswer(WORD_PUZZLES[0].word)]).puzzle.word, WORD_PUZZLES[0].word)
assert.equal(gameDay(Date.parse('2026-09-06T05:59:59Z')), '2026-09-05')
assert.equal(gameDay(Date.parse('2026-09-06T06:00:00Z')), '2026-09-06')
const daily = createDailyChallenge(DEFAULT_CONTENT, '2026-09-05')
assert.deepEqual(daily, createDailyChallenge(JSON.parse(JSON.stringify(DEFAULT_CONTENT)), '2026-09-05'))
assert.equal(daily.pairs.length, 6)
assert.equal(daily.passages.length, 5)
assert.notDeepEqual(daily, createDailyChallenge(DEFAULT_CONTENT, '2026-09-06'))
const dailyResult = { ...result, dailyKey: '2026-09-05:wordle' }
const dailyProgress = recordResult(emptyProgress(), dailyResult)
assert.equal(recordResult(dailyProgress, { ...dailyResult, id: 'another-round', score: 100 }), dailyProgress)
const migrated = parseProgress(JSON.stringify({ version: 1, games: progress.games, recentIds: ['legacy-round'] }))
assert.deepEqual(migrated.games.wordle, progress.games.wordle)
assert.deepEqual(migrated.games.order, { played: 0, won: 0, best: 0, points: 0 })
assert.deepEqual(migrated.wordCycle, [])
assert.deepEqual(parseProgress(JSON.stringify({ ...dailyProgress, wordCycle: cycle })).wordCycle, cycle)

const target = { kind: 'wordle' as const, puzzle: addedWord }
let reviews = reviewTools.updateReview([], { target, correct: false }, '2026-09-05')
assert.equal(reviews[0].due, '2026-09-05')
reviews = reviewTools.updateReview(reviews, { target, correct: true }, '2026-09-05')
assert.equal(reviews[0].due, '2026-09-06')
assert.deepEqual(reviewTools.updateReview(reviews, { target, correct: true }, '2026-09-05'), reviews)
reviews = reviewTools.updateReview(reviews, { target, correct: true }, '2026-09-06')
assert.equal(reviews[0].due, '2026-09-09')
reviews = reviewTools.updateReview(reviews, { target, correct: true }, '2026-09-09')
assert.equal(reviews[0].due, '2026-09-16')
assert.deepEqual(reviewTools.updateReview(reviews, { target, correct: true }, '2026-09-16'), [])
const resetReview = reviewTools.updateReview(reviews, { target, correct: false }, '2026-09-10')
assert.equal(resetReview[0].successes, 0)
assert.equal(resetReview[0].misses, 2)
assert.deepEqual(reviewTools.parseReview([null, ...reviews, { target: {} }]), reviews)
assert.deepEqual(parseProgress(JSON.stringify({ ...emptyProgress(), reviews })).reviews, reviews)

const orderVerses = [{ ...verses[0], text: 'La luz y la luz.' }, { ...verses[1], text: 'Una palabra muy larga para practicar.' }]
const ordering = orderTools.createOrderQuestions(orderVerses, 3, seededRandom('orden'))
assert.deepEqual(ordering, orderTools.createOrderQuestions([...orderVerses].reverse(), 3, seededRandom('orden')))
for (const question of ordering) {
  assert.equal(orderTools.isOrdered(question.tokens, question.shuffled), false)
  assert.equal(orderTools.isOrdered(question.tokens, question.tokens.map((_, index) => index)), true)
  assert.equal(new Set(question.shuffled).size, question.tokens.length)
}
assert.equal(orderTools.isOrdered(['la', 'la', 'luz'], [1, 0, 2]), true)
assert.equal(orderTools.isOrdered(['la', 'la', 'luz'], [0, 0, 2]), false)
assert.equal(orderTools.isOrdered(['la', 'luz'], [-1, 0]), false)
assert.deepEqual(orderTools.createOrderQuestions([{ ...verses[0], text: 'una '.repeat(50) }]), [])
const focused = createVerseQuestions(verses, 1, seededRandom('repaso'), verses[2])
assert.equal(focused.length, 1)
assert.equal(focused[0].verse.id, verses[2].id)
assert.deepEqual(createVerseQuestions(verses, 5, seededRandom('daily')), createVerseQuestions([...verses].reverse(), 5, seededRandom('daily')))

const editable = { revision: 1, catalog: DEFAULT_CONTENT, books: [{ bookId: 1, name: 'Génesis' }] }
const draft = { ...editorTools.emptyDraft(), word: addedWord.word, clue: addedWord.clue, chapter: '17', verse: '5' }
const expanded = editorTools.applyContentDraft(editable, 'words', draft, null)
assert.equal(expanded.words.length, 51)
assert.equal(expanded.words.at(-1)?.reference, 'Génesis 17:5')
assert.equal(DEFAULT_CONTENT.words.length, 50)
assert.throws(() => editorTools.applyContentDraft(editable, 'words', { ...draft, word: 'Adán' }, null), /repetid/)
assert.throws(() => editorTools.applyContentDraft(editable, 'words', { ...draft, bookId: '0' }, null))
assert.throws(() => editorTools.applyContentDraft(editable, 'words', { ...draft, clue: '' }, null))
console.log('Ampliación: ciclos sin repetir, retos por fecha, migración, repasos, orden y editor verificados.')
