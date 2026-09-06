import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { BibleVersion } from '@/lib/types';
import type { GameVerse } from '@/lib/games/engine';
import type { RoundContext } from '@/lib/games/round';
import { useOrderGame, type OnGameComplete } from '@/lib/games/hooks';
import { GameButton, GameCard, GameText, GameResultPanel, LiveMessage, PassageButton, styles, type OpenPassage } from './ui';

export function OrderRound({ verses, bible, onComplete, onOpen, onRestart, ...context }: RoundContext & { verses: GameVerse[]; bible: BibleVersion; onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const { colors } = useAppTheme();
  const game = useOrderGame(verses, onComplete, { ...context, bibleId: bible.bibleId });
  if (!game.questions.length) return <GameCard><GameText>No hay pasajes de 3 a 40 palabras disponibles para esta partida. Prueba otra versión.</GameText><GameButton label="Elegir otra versión" onPress={onRestart} /></GameCard>;
  if (game.finished) return <GameResultPanel title={`${game.correctCount} de ${game.questions.length} versículos ordenados`} score={game.score} onRestart={onRestart}>
    {game.questions.map(({ verse }, index) => <View key={verse.id} style={styles.column}><GameText>{game.answers[index] ? 'Correcto' : 'Para repasar'}</GameText><Text style={[styles.verse, { color: colors.text, fontSize: 20, lineHeight: 31 }]}>{verse.text}</Text><PassageButton passage={{ ...verse, reference: `${verse.bookName} ${verse.chapter}:${verse.verse}` }} bibleId={bible.bibleId} onOpen={onOpen} /></View>)}
  </GameResultPanel>;
  const question = game.question;
  const tokenButton = (token: number, placed: boolean, position: number) => <Pressable key={token} accessibilityRole="button" accessibilityLabel={`${placed ? 'Quitar' : 'Agregar'} ${question.tokens[token]}, ${placed ? 'posición' : 'ficha'} ${position + 1}`} accessibilityState={{ disabled: game.answered }} disabled={game.answered} onPress={() => placed ? game.remove(token) : game.choose(token)} style={({ pressed }) => ({ minHeight: 48, maxWidth: '100%', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, borderColor: placed ? colors.primary : colors.border, backgroundColor: colors.card, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>{question.tokens[token]}</Text></Pressable>;
  return <View style={styles.column}>
    <GameText muted>Versículo {game.index + 1} de {game.questions.length} · {bible.abbr}</GameText>
    <GameCard><GameText heading>{question.verse.bookName} {question.verse.chapter}:{question.verse.verse}</GameText><GameText muted>Toca las palabras en el orden del versículo.</GameText>
      <View style={{ minHeight: 120, padding: 12, borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, borderColor: colors.primary, backgroundColor: colors.primarySoft, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {!game.selected.length && <GameText muted>Tu versículo aparecerá aquí.</GameText>}
        {game.selected.map((token, position) => tokenButton(token, true, position))}
      </View>
      <LiveMessage text={`${game.selected.length} de ${question.tokens.length} palabras colocadas`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{question.shuffled.filter(token => !game.selected.includes(token)).map(token => tokenButton(token, false, question.shuffled.indexOf(token)))}</View>
      {game.answered ? <><LiveMessage text={game.answers[game.index] ? '¡Lo ordenaste correctamente!' : 'Este es el orden del versículo. Puedes practicarlo en Repasar mis errores.'} /><Text style={[styles.verse, { color: colors.text, fontSize: 21, lineHeight: 32 }]}>{question.verse.text}</Text><GameButton label={game.index === game.questions.length - 1 ? 'Ver resultado' : 'Siguiente versículo'} onPress={game.next} /></> : <><GameButton label="Comprobar orden" disabled={game.selected.length !== question.tokens.length} onPress={() => game.submit()} /><GameButton secondary label="Empezar de nuevo" disabled={!game.selected.length} onPress={game.clear} /><GameButton secondary label="Mostrar respuesta" onPress={() => game.submit(true)} /></>}
    </GameCard>
    {!!bible.attribution && <GameText muted>{bible.attribution}</GameText>}
  </View>;
}
