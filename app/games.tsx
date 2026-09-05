import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { getMeta, setMeta } from '@/lib/db';
import { loadGameContent } from '@/lib/api';
import { GAME_CATALOG } from '@/lib/games/content';
import { useGamesSession, type GameStorage } from '@/lib/games/session';
import { CompleteVerse } from '@/components/games/CompleteVerse';
import { MemoryGame } from '@/components/games/MemoryGame';
import { WordGame } from '@/components/games/WordGame';
import { ContentEditor } from '@/components/games/ContentEditor';
import { GameButton, GameCard, GameText, LiveMessage, styles, type OpenPassage } from '@/components/games/ui';

const storage: GameStorage = { get: getMeta, set: setMeta };

export default function GamesScreen() {
  const { user, isLoading } = useAuth();
  const { colors } = useAppTheme();
  return <><Stack.Screen options={{ title: 'Juegos bíblicos', headerBackTitle: 'Atrás' }} />{isLoading ? <ActivityIndicator color={colors.primary} /> : <GamesHub key={user?.id ?? 'guest'} userId={user?.id} isAdmin={user?.role === 'admin'} />}</>;
}

function GamesHub({ userId, isAdmin }: { userId?: number; isAdmin: boolean }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const contentPadding = useContentPadding();
  const scroll = useRef<ScrollView>(null);
  const session = useGamesSession({ storage, storageKey: `games-v2-${userId ?? 'guest'}`, legacyKey: `games-v1-${userId ?? 'guest'}`, loadContent: loadGameContent });
  const [view, setView] = useState<'free' | 'daily' | 'review' | 'editor'>('free');
  const { progress, active } = session;
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (!active && view === 'free') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (active) session.back(); else setView('free'); return true; });
    return () => subscription.remove();
  }, [active, view]);
  const onOpen: OpenPassage = (passage, bibleId) => router.push({ pathname: '/(tabs)/bible', params: { mode: 'reader', bookId: String(passage.bookId), chapter: String(passage.chapter), verse: String(passage.verse), ...(bibleId ? { bibleId: String(bibleId) } : {}) } });
  const game = GAME_CATALOG.find(entry => entry.id === active?.game);
  const totalPlayed = Object.values(progress.games).reduce((sum, stats) => sum + stats.played, 0);
  const totalPoints = Object.values(progress.games).reduce((sum, stats) => sum + stats.points, 0);
  const due = session.reviews.filter(item => item.due <= session.today).length;
  const roundProps = { onComplete: session.onComplete, onOpen, onRestart: session.restart, settings: active?.settings, onAttempt: session.onAttempt };

  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 24, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
    {view === 'editor' && isAdmin ? <><GameButton secondary label="Volver a juegos" onPress={() => { setView('free'); void session.refresh(); }} /><ContentEditor onEdit={() => scroll.current?.scrollTo({ y: 0, animated: false })} /></> : game && active ? <>
      <View style={styles.row}><View style={{ flex: 1 }}><GameButton secondary label="Volver a juegos" onPress={session.back} /></View><View style={{ flex: 1 }}><GameButton secondary label="Reiniciar" onPress={session.restart} /></View></View>
      <GameText heading>{game.title}</GameText><GameText muted>{game.description}</GameText>
      {active.settings.mode !== 'free' && <GameText>{active.settings.mode === 'daily' ? `Reto diario · ${active.settings.dailyDate}${progress.dailyScores[`${active.settings.dailyDate}:${game.id}`] ? ' · Resultado guardado; repetir no suma puntos adicionales.' : ''}` : 'Repasar mis errores'}</GameText>}
      <View key={active.id}>
        {(active.game === 'complete' || active.game === 'order') && <CompleteVerse {...roundProps} order={active.game === 'order'} />}
        {active.game === 'memory' && <MemoryGame {...roundProps} />}
        {active.game === 'wordle' && <WordGame {...roundProps} />}
      </View>
    </> : <>
      <View style={styles.column}><GameText heading>Aprender jugando</GameText><GameText muted>Practica a tu ritmo, descubre el reto de hoy o vuelve a un pasaje que quieras recordar.</GameText></View>
      {!session.ready && <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando resultados" />}
      <View style={styles.row}>{([['free', 'Jugar libre'], ['daily', 'Reto diario'], ['review', `Repasar mis errores${due ? ` (${due})` : ''}`]] as const).map(([id, label]) => <GameButton key={id} label={label} secondary={view !== id} selected={view === id} onPress={() => setView(id)} />)}</View>
      {view === 'daily' && <GameCard><GameText heading>El reto del {session.today}</GameText><GameText muted>Una partida de cada juego. Los retos cambian a medianoche de Ciudad de México y son los mismos en web y móvil. Cada juego suma puntos una sola vez al día en este dispositivo.</GameText>{!session.dailyAvailable && <LiveMessage text="Actualiza el contenido con conexión para cargar el reto de hoy." />}</GameCard>}
      {view !== 'review' ? GAME_CATALOG.map(entry => {
        const result = view === 'daily' ? progress.dailyScores[`${session.today}:${entry.id}`] : undefined;
        return <GameCard key={entry.id}>
          <GameText heading>{entry.title}</GameText><GameText muted>{entry.description}</GameText>
          <GameText muted>{result ? `Completado · ${result.score}/100` : entry.id === 'wordle' && view === 'free' ? `${session.catalog.words.length} palabras · sin repetir hasta recorrerlas todas` : entry.detail}</GameText>
          <GameButton label={`${result ? 'Repetir' : 'Jugar'} · ${entry.title}`} disabled={!session.ready || (view === 'daily' && !session.dailyAvailable)} onPress={() => session.start(entry.id, view === 'daily' ? 'daily' : 'free')} />
        </GameCard>;
      }) : <View style={styles.column}>
        <GameText heading>{session.reviews.length ? `${due} para hoy · ${session.reviews.length} pendientes` : 'Tu lista de repaso está vacía'}</GameText><GameText muted>Aquí aparecerán los Wordle que no resuelvas y los versículos que falles. Después de acertar, volverás a practicarlos en 1, 3 y 7 días.</GameText>
        {session.reviews.map(item => <GameCard key={item.key}><GameText>{item.target.kind === 'wordle' ? item.target.puzzle.clue : item.target.passage.reference}</GameText><GameText muted>{GAME_CATALOG.find(game => game.id === item.target.kind)?.title} · {item.due <= session.today ? 'Para hoy' : `Próximo repaso: ${item.due}`} · {item.successes}/4 repasos correctos</GameText><GameButton label="Practicar" disabled={!session.ready} onPress={() => session.start(item.target.kind, 'review', item.target)} /></GameCard>)}
      </View>}
      <GameButton secondary label={session.refreshing ? 'Actualizando…' : 'Actualizar contenido'} disabled={session.refreshing} onPress={() => void session.refresh()} />
      {isAdmin && <GameButton secondary label="Administrar contenido" onPress={() => setView('editor')} />}
      {!!session.contentError && <LiveMessage text={session.contentError} />}
      <GameCard><GameText heading>Tus resultados</GameText><GameText muted>{totalPlayed} partidas · {totalPoints} puntos</GameText>
        {GAME_CATALOG.map(entry => <View key={entry.id} style={{ gap: 4 }}><GameText>{entry.title}</GameText><GameText muted>{progress.games[entry.id].played ? `Mejor: ${progress.games[entry.id].best}/100 · ${progress.games[entry.id].played} partidas` : 'Por jugar'}</GameText></View>)}
        <GameText muted>Resultados, palabras jugadas y repasos guardados en este dispositivo{userId ? ' para tu cuenta' : ' como visitante'}. No se sincronizan entre dispositivos.</GameText>
      </GameCard>
    </>}
    {session.storageError && <LiveMessage text="Puedes seguir jugando, pero no se pudieron guardar tus resultados. Las palabras podrían repetirse al volver." />}
  </ScrollView>;
}
