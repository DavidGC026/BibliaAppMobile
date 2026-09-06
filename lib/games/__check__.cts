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

// Progreso entre dispositivos, guardados, filtros y entrenamiento (v3).
const training = require('./training') as typeof import('./training')
const syncing = require('./sync') as typeof import('./sync')
const saving = require('./saved-round') as typeof import('./saved-round')
const journaling = require('./persistence') as typeof import('./persistence')
type Operation = import('./sync').ProgressOperation
type Account = import('./sync').AccountProgress
type SavedRound = import('./saved-round').SavedRound
const trainingTime = Date.parse('2026-09-06T18:00:00Z')
const apply = (account: Account, operation: Operation) => syncing.applyOperation(account, operation, trainingTime)
const savedWord = (id: string, puzzle = WORD_PUZZLES[0]): SavedRound => ({ id, game: 'wordle', settings: { mode: 'free', seed: id, word: puzzle }, checkpoint: {}, createdAt: trainingTime, updatedAt: trainingTime })
const finish = (id: string, score = 100): Operation => ({ id: `result:${id}`, at: trainingTime, type: 'result', roundId: id, mode: 'free', result: { id: `result:${id}`, game: 'wordle', score, won: true } })
let serial = 0
for (const length of [null, 4, 5, 6, 7]) for (const category of [null, ...catalogTools.WORD_CATEGORIES]) {
  const filters = { length, category }
  const pool = training.filterWords(WORD_PUZZLES, filters)
  assert.ok(pool.every(word => (!length || normalizeAnswer(word.word).length === length) && (!category || word.category === category)))
  if (!pool.length) { assert.throws(() => training.chooseFilteredWord(pool), /No hay palabras/); continue }
  let account = syncing.emptyAccount()
  let previous = ''
  for (let lap = 0; lap < 3; lap++) {
    const picked = new Set<string>()
    for (let index = 0; index < pool.length; index++) {
      const next = training.chooseFilteredWord(pool, account.cycles[training.filterKey(filters)], seededRandom(`filtered-${serial}`))
      const word = normalizeAnswer(next.puzzle.word)
      assert.ok(!picked.has(word), 'Cada filtro recorre su banco antes de repetir')
      if (pool.length > 1) assert.notEqual(word, previous, 'Evita repetir en el cambio de ciclo')
      const round = savedWord(`filtered-${serial++}`, next.puzzle)
      account = apply(account, { id: `start:${round.id}`, at: trainingTime, type: 'start', round, wordUse: { filters, count: next.count, pool: next.pool } })
      picked.add(word); previous = word
    }
    assert.equal(picked.size, pool.length)
  }
}
assert.deepEqual(training.parseFilters({ length: 50, category: 'desconocida' }), training.defaultFilters())
const legacyAccount = { ...emptyProgress(), games: { ...emptyProgress().games, wordle: { played: 3, won: 2, points: 190, best: 100 } }, dailyScores: { '2026-09-05:wordle': { score: 100, won: true } }, wordCycle: WORD_PUZZLES.slice(0, 49).map(word => normalizeAnswer(word.word)) }
const imported: Operation = { id: 'legacy-device-a', at: trainingTime, type: 'import', progress: legacyAccount }
let account = apply(syncing.emptyAccount(), imported)
assert.deepEqual(account.totals.games.wordle, legacyAccount.games.wordle)
assert.equal(apply(account, imported), account, 'Una importación repetida no duplica datos')
assert.equal(training.chooseFilteredWord(WORD_PUZZLES, account.cycles['all:all']).puzzle.word, WORD_PUZZLES[49].word, 'La migración conserva las palabras por jugar')
const secondLegacy = { ...emptyProgress(), games: { ...emptyProgress().games, wordle: { played: 2, won: 2, points: 180, best: 100 } }, dailyScores: legacyAccount.dailyScores }
account = apply(account, { id: 'legacy-device-b', at: trainingTime, type: 'import', progress: secondLegacy })
assert.equal(account.totals.games.wordle.played, 4)
assert.equal(account.totals.games.wordle.points, 270, 'Los diarios antiguos se combinan sin duplicar puntos conocidos')
const startOperation: Operation = { id: 'start:resume-word', at: trainingTime, type: 'start', round: savedWord('resume-word') }
account = apply(account, startOperation)
const saveOperation: Operation = { id: 'checkpoint-word-1', at: trainingTime + 10, type: 'save', round: { ...savedWord('resume-word'), updatedAt: trainingTime + 10, checkpoint: { guesses: ['XXXX'], draft: 'AB', hints: [0] } } }
account = apply(account, saveOperation)
assert.deepEqual(account.rounds['resume-word'].checkpoint, saveOperation.round.checkpoint)
account = apply(account, { ...saveOperation, id: 'checkpoint-word-old', round: { ...savedWord('resume-word'), checkpoint: { draft: 'Z' } } })
assert.equal(account.rounds['resume-word'].checkpoint.draft, 'AB', 'Un guardado atrasado no pisa el más reciente')
account = apply(account, finish('resume-word'))
assert.equal(account.rounds['resume-word'], undefined)
account = apply(account, { ...saveOperation, id: 'late-save-after-finish', at: trainingTime + 50, round: { ...saveOperation.round, updatedAt: trainingTime + 50 } })
assert.equal(account.rounds['resume-word'], undefined, 'Un guardado pendiente no revive una partida terminada')
assert.deepEqual(JSON.parse(JSON.stringify(syncing.parseAccount(JSON.parse(JSON.stringify(account))))), JSON.parse(JSON.stringify(account)))
assert.throws(() => syncing.parseOperation({ ...finish('invalid'), result: { game: 'wordle', score: 1000, won: true } }))
assert.throws(() => syncing.parseOperation({ ...finish('invalid'), mode: 'daily' }))
assert.throws(() => syncing.parseOperation({ ...startOperation, id: '__proto__' }))
assert.throws(() => saving.parseSavedRound({ ...savedWord('invalid'), settings: { mode: 'review', seed: 'x' } }))
assert.equal(saving.parseCheckpoint({ selected: [-1, 3], hints: [0, 0] }).selected, undefined)
const firstChange = finish('offline-a', 80), secondChange = finish('offline-b', 90)
const serverAccount = apply(syncing.emptyAccount(), firstChange)
const localJournal = { version: 3 as const, account: apply(serverAccount, secondChange), pending: [firstChange, secondChange] }
const acknowledged = journaling.acknowledgeJournal(localJournal, { progress: serverAccount, acknowledged: [firstChange.id], serverTime: trainingTime }, trainingTime)
assert.equal(acknowledged.pending.length, 1)
assert.equal(acknowledged.account.totals.games.wordle.points, 170, 'La respuesta no pierde lo jugado durante la solicitud')
assert.deepEqual(JSON.parse(JSON.stringify(journaling.parseJournal(JSON.stringify(acknowledged)))), JSON.parse(JSON.stringify(acknowledged)))

const wrong: Operation = { id: 'review-wrong-original', at: trainingTime, type: 'attempt', roundId: 'review-1', mode: 'free', attempt: { target, correct: false } }
let learning = apply(syncing.emptyAccount(), wrong)
learning = apply(learning, { ...wrong, id: 'review-success-next', at: trainingTime + 1000, mode: 'review', attempt: { target, correct: true } })
const scheduled = learning.totals.reviews[0]
learning = apply(learning, { ...wrong, id: 'review-late-offline', at: trainingTime - 1000 })
assert.deepEqual(learning.totals.reviews[0], scheduled, 'Un error atrasado no reinicia un repaso posterior')
learning = apply(learning, { ...wrong, id: 'review-success-same-day', at: trainingTime + 2000, mode: 'review', attempt: { target, correct: true } })
assert.equal(training.weeklySummary(learning.activity, learning.totals.reviews, '2026-09-06').reviews, 1)
const resultActivity = Array.from({ length: 6 }, (_, index) => ({ id: `learn-${index}`, at: trainingTime + index, day: '2026-09-06', game: 'order' as const, kind: 'result' as const, score: 100, correct: true, mode: 'free' as const }))
assert.equal(training.automaticLevel([], 'order'), 'initial')
assert.equal(training.automaticLevel(resultActivity.slice(0, 3), 'order'), 'intermediate')
assert.equal(training.automaticLevel(resultActivity, 'order'), 'advanced')
assert.equal(training.automaticLevel(resultActivity.map(item => ({ ...item, score: 20 })), 'order'), 'initial')
const gradedVerses = Array.from({ length: 12 }, (_, index) => ({ ...verses[0], id: index + 1, verse: index + 1, text: `${'Palabra '.repeat(index + 2)}final.` }))
const initialLength = training.selectLevelVerses(gradedVerses, 'initial', 3).map(verse => verse.text.length)
const advancedLength = training.selectLevelVerses(gradedVerses, 'advanced', 3).map(verse => verse.text.length)
assert.ok(Math.max(...initialLength) < Math.min(...advancedLength))
assert.deepEqual(training.selectLevelVerses(gradedVerses, undefined), gradedVerses)
const week = training.weeklySummary([...resultActivity, { ...resultActivity[0], id: 'outside-week', day: '2026-08-30' }], [], '2026-09-06')
assert.equal(week.played, 6)
assert.equal(week.points, 600)
assert.equal(week.days[0].day, '2026-08-31')
console.log('Entrenamiento: sincronización, importación, filtros, guardados, dificultad y resumen semanal verificados.')

const queued = Array.from({ length: 240 }, (_, index) => finish(`queued-${index}`))
assert.equal(journaling.synchronizationBatch(queued).length, 100)
const largeImport: Operation = { id: 'large-history', at: trainingTime, type: 'import', progress: { ...emptyProgress(), recentIds: Array.from({ length: 3000 }, (_, index) => `${index}:${'a'.repeat(130)}`) } }
assert.equal(journaling.synchronizationBatch([largeImport, largeImport]).length, 1, 'Las colas grandes se envían sin superar el límite del servidor')
