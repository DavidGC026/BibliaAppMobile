import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import type { BibleVersion } from '@/lib/types';
import { normalizeAnswer, type GameVerse } from '@/lib/games/engine';
import { useVerseGame, type OnGameComplete } from '@/lib/games/hooks';
import type { RoundContext } from '@/lib/games/round';
import { OrderRound } from './OrderGame';
import { GameButton, GameCard, GameText, GameResultPanel, LiveMessage, PassageButton, styles, type OpenPassage } from './ui';

type Props = RoundContext & { onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void; order?: boolean };

export function CompleteVerse(props: Props) {
  const { settings, order = false } = props;
  const count = settings?.review ? 1 : order ? 3 : 5;
  const { colors } = useAppTheme();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [bibleId, setBibleId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<{ bible: BibleVersion; verses: GameVerse[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [difficulty, setDifficulty] = useState<'options' | 'write'>('options');
  const [started, setStarted] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setLoaded(null);
    Promise.all([api.listBibles(), api.listGameVerses(bibleId ?? undefined, settings)])
      .then(([catalog, response]) => { if (active) { setBibles(catalog.bibles); setLoaded(response); } })
      .catch(() => { if (active) setError('No pudimos cargar los versículos. Revisa tu conexión e intenta de nuevo.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bibleId, retry, settings]);

  if (started && loaded) return order ? <OrderRound verses={loaded.verses} bible={loaded.bible} {...props} /> : <VerseRound verses={loaded.verses} bible={loaded.bible} difficulty={difficulty} {...props} />;
  return <GameCard>
    <GameText heading>Prepara tu partida</GameText><GameText>Versión bíblica</GameText>
    {bibles.length > 0 && <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' }}><Picker enabled={!settings?.review} accessibilityLabel="Versión bíblica" selectedValue={bibleId ?? loaded?.bible.bibleId} onValueChange={(value) => { if (value != null) setBibleId(Number(value)); }} style={{ color: colors.text }} dropdownIconColor={colors.text} itemStyle={{ color: colors.text }}>{bibles.map((bible) => <Picker.Item key={bible.bibleId} label={`${bible.name} (${bible.abbr})`} value={bible.bibleId} />)}</Picker></View>}
    {!order && settings?.mode !== 'daily' && <><GameButton label="Con opciones · elige una palabra" secondary={difficulty !== 'options'} selected={difficulty === 'options'} onPress={() => setDifficulty('options')} />
    <GameButton label="De memoria · escribe la palabra" secondary={difficulty !== 'write'} selected={difficulty === 'write'} onPress={() => setDifficulty('write')} /></>}
    <GameText muted>{count} {count === 1 ? 'versículo' : 'versículos'}, sin límite de tiempo. {order ? 'Toca las palabras en orden. Toca una palabra colocada para devolverla al grupo.' : 'Las tildes no cuentan al escribir.'}</GameText>
    {loading && <ActivityIndicator accessibilityLabel="Cargando versículos" color={colors.primary} />}
    {!!error && <><LiveMessage text={error} /><GameButton secondary label="Reintentar" onPress={() => setRetry((value) => value + 1)} /></>}
    {loaded && loaded.verses.length < count && <GameText>Esta versión no tiene suficientes pasajes. Elige otra versión.</GameText>}
    <GameButton label={`Comenzar · ${count} ${count === 1 ? 'versículo' : 'versículos'}`} disabled={loading || !loaded || loaded.verses.length < count || !!error} onPress={() => setStarted(true)} />
  </GameCard>;
}

function VerseRound({ verses, bible, difficulty, onComplete, onOpen, onRestart, settings, onAttempt }: Props & { verses: GameVerse[]; bible: BibleVersion; difficulty: 'options' | 'write' }) {
  const { colors } = useAppTheme();
  const game = useVerseGame(verses, onComplete, { settings, onAttempt, bibleId: bible.bibleId });
  const [draft, setDraft] = useState('');
  if (!game.questions.length) return <GameCard><GameText>No hay suficientes palabras para preparar la partida.</GameText><GameButton label="Elegir otra versión" onPress={onRestart} /></GameCard>;
  if (game.finished) return <GameResultPanel title={`${game.correctCount} de ${game.questions.length} respuestas correctas`} score={game.score} onRestart={onRestart}>
    <GameText muted>Repasa los pasajes · {bible.abbr}</GameText>
    {game.questions.map((question, index) => <View key={question.verse.id} style={[styles.column, { paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border }]}>
      <GameText>{normalizeAnswer(game.answers[index]) === normalizeAnswer(question.answer) ? 'Correcta' : `Tu respuesta: ${game.answers[index]}`}</GameText>
      <Text style={[styles.verse, { color: colors.text, fontSize: 20, lineHeight: 31 }]}>{question.before}<Text style={{ fontWeight: '700' }}>{question.answer}</Text>{question.after}</Text>
      <PassageButton passage={{ ...question.verse, reference: `${question.verse.bookName} ${question.verse.chapter}:${question.verse.verse}` }} bibleId={bible.bibleId} onOpen={onOpen} />
    </View>)}
  </GameResultPanel>;

  const question = game.question;
  const correct = game.answered && normalizeAnswer(game.answers[game.index]) === normalizeAnswer(question.answer);
  return <View style={styles.column}>
    <GameText muted>Versículo {game.index + 1} de {game.questions.length} · {bible.abbr} · {game.correctCount} aciertos</GameText>
    <GameCard>
      <GameText>{question.verse.bookName} {question.verse.chapter}:{question.verse.verse}</GameText>
      <Text style={[styles.verse, { color: colors.text }]}>{question.before}<Text accessibilityLabel={game.answered ? question.answer : 'palabra que falta'} style={{ fontWeight: '700', textDecorationLine: 'underline' }}>{game.answered ? question.answer : ' _____ '}</Text>{question.after}</Text>
      {difficulty === 'options' ? <View style={styles.column}>{question.options.map((option) => <GameButton key={option} secondary label={`${option}${game.answered && normalizeAnswer(option) === normalizeAnswer(question.answer) ? ' · Correcta' : option === game.answers[game.index] ? ' · Tu respuesta' : ''}`} disabled={game.answered} onPress={() => game.answer(option)} />)}</View> : <View style={styles.column}>
        <GameText>La palabra que falta</GameText>
        <TextInput accessibilityLabel="La palabra que falta" value={draft} onChangeText={setDraft} autoCorrect={false} autoCapitalize="none" editable={!game.answered} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} returnKeyType="done" onSubmitEditing={() => game.answer(draft)} />
        {!game.answered && <GameButton label="Comprobar" disabled={!draft.trim()} onPress={() => game.answer(draft)} />}
      </View>}
      {game.answered && <><LiveMessage text={correct ? '¡Correcto!' : `La palabra es «${question.answer}». Sigue practicando.`} /><GameButton label={game.index === game.questions.length - 1 ? 'Ver resultado' : 'Siguiente versículo'} onPress={() => { setDraft(''); game.next(); }} /></>}
    </GameCard>
    {!!bible.attribution && <GameText muted>{bible.attribution}</GameText>}
  </View>;
}
