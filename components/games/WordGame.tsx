import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { gradeGuess, keyboardGrades, LETTER_LABELS } from '@/lib/games/engine';
import { useWordGame, type OnGameComplete } from '@/lib/games/hooks';
import type { RoundContext } from '@/lib/games/round';
import { GameButton, GameCard, GameText, GameResultPanel, LiveMessage, PassageButton, GAME_LETTER_COLORS, LETTER_SYMBOLS, styles, type OpenPassage } from './ui';

export function WordGame({ onComplete, onOpen, onRestart, ...context }: RoundContext & { onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void }) {
  const { colors } = useAppTheme();
  const game = useWordGame(onComplete, context);
  const input = useRef<TextInput>(null);
  const keys = keyboardGrades(game.guesses, game.target);
  const canReveal = [...game.target].some((letter, index) => !game.hints.includes(index) && !game.guesses.some((guess) => guess[index] === letter));
  const lastGuess = game.guesses.at(-1);
  const lastFeedback = lastGuess ? [...lastGuess].map((letter, index) => `${letter}: ${LETTER_LABELS[gradeGuess(lastGuess, game.target)[index]]}`).join('. ') : '';
  return <View style={styles.column}>
    <GameCard><GameText muted>{game.puzzle.category} · {game.target.length} letras</GameText><GameText heading>{game.puzzle.clue}</GameText></GameCard>
    <View style={{ gap: 5, width: '100%', maxWidth: 440, alignSelf: 'center' }}>{Array.from({ length: 6 }, (_, row) => {
      const guess = game.guesses[row];
      const letters = guess ?? (row === game.guesses.length ? game.draft : '');
      const marks = guess ? gradeGuess(guess, game.target) : null;
      return <View key={row} accessible accessibilityLabel={`Intento ${row + 1}: ${guess ? [...guess].map((letter, index) => `${letter}, ${LETTER_LABELS[marks![index]]}`).join('; ') : 'pendiente'}`} style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: game.target.length }, (_, column) => {
          const grade = marks?.[column];
          const background = grade === 'correct' || grade === 'present' ? GAME_LETTER_COLORS[grade] : grade ? colors.muted : colors.card;
          return <View key={column} style={{ flex: 1, aspectRatio: 1, maxHeight: 62, borderRadius: 6, borderWidth: 2, borderColor: grade ? background : letters[column] ? colors.primary : colors.border, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 21, fontWeight: '800', color: grade && grade !== 'absent' ? '#FFFFFF' : colors.text }}>{letters[column]}</Text>
            {grade && <Text style={{ position: 'absolute', bottom: 0, right: 2, fontSize: 10, color: grade === 'absent' ? colors.text : '#FFFFFF' }}>{LETTER_SYMBOLS[grade]}</Text>}
          </View>;
        })}
      </View>;
    })}</View>
    <GameText muted>● Verde: posición correcta · ↔ Ocre: otra posición · × Gris: no aparece</GameText>
    {game.finished ? <GameResultPanel title={game.won ? '¡Encontraste la palabra!' : `La palabra era ${game.puzzle.word}`} score={game.score} onRestart={onRestart}>
      <GameText>{game.puzzle.word} · {game.guesses.length} de 6 intentos.</GameText><PassageButton passage={game.puzzle} onOpen={onOpen} />
    </GameResultPanel> : <>
      <GameText>Tu palabra · intento {game.guesses.length + 1} de 6</GameText>
      <TextInput ref={input} accessibilityLabel={`Palabra de ${game.target.length} letras`} value={game.draft} onChangeText={game.edit} autoCorrect={false} autoCapitalize="characters" returnKeyType="done" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, letterSpacing: 4 }]} onSubmitEditing={game.submit} />
      <GameButton label="Probar palabra" onPress={() => { game.submit(); input.current?.blur(); }} />
      <GameText muted>Sin tildes. La Ñ sí cuenta como letra distinta.</GameText>
      {!!game.error && <LiveMessage text={game.error} />}
      {!!lastGuess && <Text accessibilityLiveRegion="polite" accessible style={{ height: 1, overflow: 'hidden', color: colors.text }} accessibilityLabel={lastFeedback}>{lastFeedback}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>{[...'QWERTYUIOPASDFGHJKLÑZXCVBNM'].map((letter) => {
        const grade = keys[letter];
        const background = grade === 'correct' || grade === 'present' ? GAME_LETTER_COLORS[grade] : grade ? colors.muted : colors.card;
        return <Pressable key={letter} accessibilityRole="button" accessibilityLabel={`${letter}${grade ? `, ${LETTER_LABELS[grade]}` : ''}`} onPress={() => game.edit(game.draft + letter)} style={({ pressed }) => ({ width: 44, minHeight: 48, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: background, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><Text style={{ fontSize: 17, fontWeight: '700', color: grade && grade !== 'absent' ? '#FFFFFF' : colors.text }}>{letter}</Text>{grade && <Text style={{ fontSize: 10, color: grade === 'absent' ? colors.text : '#FFFFFF' }}>{LETTER_SYMBOLS[grade]}</Text>}</Pressable>;
      })}</View>
      <GameButton secondary label="Borrar una letra" onPress={() => game.edit(game.draft.slice(0, -1))} />
      <GameButton secondary label="Revelar una letra · −15 puntos" disabled={!canReveal} onPress={game.reveal} />
      {game.hints.length > 0 && <LiveMessage text={game.hints.map((position) => `Letra ${position + 1}: ${game.target[position]}`).join(' · ')} />}
    </>}
  </View>;
}
