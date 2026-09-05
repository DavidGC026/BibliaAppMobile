import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from '@/components/ui/AppIcon';
import { useMemoryGame, type OnGameComplete } from '@/lib/games/hooks';
import type { RoundContext } from '@/lib/games/round';
import { GameButton, GameCard, GameResultPanel, GameText, LiveMessage, PassageButton, styles, type OpenPassage } from './ui';

type Props = RoundContext & { onComplete: OnGameComplete; onOpen: OpenPassage; onRestart: () => void };

export function MemoryGame(props: Props) {
  const [pairCount, setPairCount] = useState(6);
  const [started, setStarted] = useState(false);
  if (started || props.settings?.mode === 'daily') return <MemoryRound pairCount={pairCount} {...props} />;
  return <GameCard>
    <GameText heading>Elige el tamaño del tablero</GameText>
    <View style={styles.row}>{[4, 6, 8].map((count) => <View key={count} style={{ flex: 1 }}><GameButton label={`${count} pares`} secondary={pairCount !== count} selected={pairCount === count} onPress={() => setPairCount(count)} /></View>)}</View>
    <GameText muted>Relaciona cada personaje con su historia. Si dos tarjetas no coinciden, se cerrarán solas después de un momento. Menos intentos, más puntos.</GameText>
    <GameButton label="Comenzar partida" onPress={() => setStarted(true)} />
  </GameCard>;
}

function MemoryRound({ pairCount, onComplete, onOpen, onRestart, settings, onAttempt }: Props & { pairCount: number }) {
  const { colors } = useAppTheme();
  const game = useMemoryGame(pairCount, onComplete, { settings, onAttempt });
  if (game.finished) return <GameResultPanel title="¡Encontraste todas las parejas!" score={game.score} onRestart={onRestart}>
    <GameText>{game.pairs.length} pares en {game.attempts} intentos.</GameText>
    {game.pairs.map((pair) => <View key={pair.id} style={styles.column}><GameText>{pair.left} · {pair.right}</GameText><PassageButton passage={pair} onOpen={onOpen} /></View>)}
  </GameResultPanel>;
  const columns = pairCount === 6 ? 3 : 2;
  const rows = Array.from({ length: Math.ceil(game.cards.length / columns) }, (_, index) => game.cards.slice(index * columns, (index + 1) * columns));
  return <View style={styles.column}>
    <LiveMessage text={`${game.matched.length} de ${game.pairs.length} pares · ${game.attempts} intentos`} />
    <View style={{ gap: 8 }}>{rows.map((row, rowIndex) => <View key={rowIndex} style={{ flexDirection: 'row', gap: 8 }}>{row.map((card, columnIndex) => {
      const matched = game.matched.includes(card.pairId);
      const visible = matched || game.flipped.includes(card.id);
      const disabled = matched || visible || game.mismatch;
      return <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={visible ? `${card.text}${matched ? ', pareja encontrada' : ''}` : `Voltear tarjeta ${rowIndex * columns + columnIndex + 1}`} accessibilityState={{ disabled, selected: visible }} disabled={disabled} onPress={() => game.flip(card.id)} style={({ pressed }) => ({ flex: 1, minHeight: 136, borderWidth: 2, borderRadius: 12, padding: 10, gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: matched ? '#166534' : visible ? colors.primarySoft : colors.card, borderColor: matched ? '#166534' : visible ? colors.primary : colors.border, opacity: pressed ? 0.7 : 1 })}>
        {matched && <AppIcon name="check" size={18} color="#FFFFFF" />}
        {visible ? <Text style={{ fontSize: 15, fontWeight: '600', lineHeight: 22, textAlign: 'center', color: matched ? '#FFFFFF' : colors.text }}>{card.text}</Text> : <AppIcon name="visibility" size={28} color={colors.textMuted} />}
      </Pressable>;
    })}</View>)}</View>
    {game.mismatch ? <GameCard><LiveMessage text="Estas tarjetas no forman pareja. Se cerrarán automáticamente." /></GameCard> : <GameText muted>{game.flipped.length ? 'Elige otra tarjeta para buscar su pareja.' : 'Voltea dos tarjetas para relacionarlas.'}</GameText>}
  </View>;
}
