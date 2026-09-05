import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { AppIcon } from '@/components/ui/AppIcon';
import { getMeta, setMeta } from '@/lib/db';
import { GAME_CATALOG, type GameId } from '@/lib/games/content';
import { emptyProgress, parseProgress, recordResult, type GameResult } from '@/lib/games/progress';
import { CompleteVerse } from '@/components/games/CompleteVerse';
import { MemoryGame } from '@/components/games/MemoryGame';
import { WordGame } from '@/components/games/WordGame';
import { GameButton, GameCard, GameText, LiveMessage, styles, type OpenPassage } from '@/components/games/ui';

export default function GamesScreen() {
  const { user, isLoading } = useAuth();
  const { colors } = useAppTheme();
  return <><Stack.Screen options={{ title: 'Juegos bíblicos', headerBackTitle: 'Atrás' }} />{isLoading ? <ActivityIndicator color={colors.primary} /> : <GamesHub key={user?.id ?? 'guest'} userId={user?.id} />}</>;
}

function GamesHub({ userId }: { userId?: number }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const contentPadding = useContentPadding();
  const scroll = useRef<ScrollView>(null);
  const [active, setActive] = useState<GameId | null>(null);
  const [round, setRound] = useState(0);
  const [progress, setProgress] = useState(emptyProgress);
  const progressRef = useRef(progress);
  const writes = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const key = `games-v1-${userId ?? 'guest'}`;
  useEffect(() => {
    let mounted = true;
    getMeta(key).then((raw) => { if (mounted) { progressRef.current = parseProgress(raw); setProgress(progressRef.current); } })
      .catch(() => { if (mounted) setStorageError(true); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [key]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setActive(null); return true; });
    return () => subscription.remove();
  }, [active, round]);
  const onComplete = useCallback((result: GameResult) => {
    const next = recordResult(progressRef.current, result);
    progressRef.current = next; setProgress(next);
    writes.current = writes.current.then(() => setMeta(key, JSON.stringify(next))).catch(() => { setStorageError(true); });
  }, [key]);
  const onOpen: OpenPassage = (passage, bibleId) => router.push({ pathname: '/(tabs)/bible', params: { mode: 'reader', bookId: String(passage.bookId), chapter: String(passage.chapter), verse: String(passage.verse), ...(bibleId ? { bibleId: String(bibleId) } : {}) } });
  const restart = () => setRound((value) => value + 1);
  const game = GAME_CATALOG.find((entry) => entry.id === active);
  const totalPlayed = Object.values(progress.games).reduce((sum, stats) => sum + stats.played, 0);
  const totalPoints = Object.values(progress.games).reduce((sum, stats) => sum + stats.points, 0);

  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 24, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
    {game ? <>
      <View style={styles.row}><View style={{ flex: 1 }}><GameButton secondary label="Volver a juegos" onPress={() => setActive(null)} /></View><View style={{ flex: 1 }}><GameButton secondary label="Reiniciar" onPress={restart} /></View></View>
      <GameText heading>{game.title}</GameText><GameText muted>{game.description}</GameText>
      <View key={`${active}-${round}`}>
        {active === 'complete' && <CompleteVerse onComplete={onComplete} onOpen={onOpen} onRestart={restart} />}
        {active === 'memory' && <MemoryGame onComplete={onComplete} onOpen={onOpen} onRestart={restart} />}
        {active === 'wordle' && <WordGame onComplete={onComplete} onOpen={onOpen} onRestart={restart} />}
      </View>
    </> : <>
      <View style={styles.column}><GameText heading>Aprender jugando</GameText><GameText muted>Recuerda un versículo, conecta una historia o descubre una palabra. Elige tu próximo reto.</GameText></View>
      {!ready && <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando resultados" />}
      {GAME_CATALOG.map((entry) => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`${entry.title}. ${entry.description}`} accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={() => { setActive(entry.id); restart(); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1, borderRadius: 16, borderColor: colors.border, backgroundColor: colors.card, padding: 20, opacity: !ready ? 0.5 : pressed ? 0.8 : 1 })}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name={entry.icon} color={colors.primary} size={23} /></View>
        <View style={{ flex: 1, gap: 8 }}><Text style={{ fontSize: 19, fontWeight: '700', color: colors.text }}>{entry.title}</Text><Text style={{ fontSize: 15, lineHeight: 23, color: colors.textMuted }}>{entry.description}</Text><Text style={{ fontSize: 12, lineHeight: 19, color: colors.textMuted }}>{entry.detail}</Text></View>
      </Pressable>)}
      <GameCard><GameText heading>Tus resultados</GameText><GameText muted>{totalPlayed} partidas · {totalPoints} puntos</GameText>
        {GAME_CATALOG.map((entry) => <View key={entry.id} style={{ gap: 4 }}><GameText>{entry.title}</GameText><GameText muted>{progress.games[entry.id].played ? `Mejor: ${progress.games[entry.id].best}/100 · ${progress.games[entry.id].played} partidas` : 'Por jugar'}</GameText></View>)}
        <GameText muted>Resultados guardados en este dispositivo{userId ? ' para tu cuenta' : ' como visitante'}. No se sincronizan entre dispositivos.</GameText>
      </GameCard>
    </>}
    {storageError && <LiveMessage text="Puedes seguir jugando, pero no se pudieron guardar tus resultados en este dispositivo." />}
  </ScrollView>;
}
