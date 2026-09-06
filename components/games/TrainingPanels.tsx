import { useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { GAME_CATALOG } from '@/lib/games/content';
import { WORD_CATEGORIES } from '@/lib/games/catalog';
import { LEVEL_LABELS, type LevelChoice } from '@/lib/games/training';
import type { GamesSession } from '@/lib/games/session';
import { GameButton, GameCard, GameText, LiveMessage, styles } from './ui';

export function FreeOptions({ session }: { session: GamesSession }) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const pickerProps = { style: { color: colors.text, backgroundColor: colors.card }, itemStyle: { color: colors.text }, dropdownIconColor: colors.text };
  return <GameCard>
    <GameButton secondary label={expanded ? "Cerrar opciones de práctica" : "Personalizar práctica"} expanded={expanded} onPress={() => setExpanded(!expanded)} />
    <GameText muted>Wordle: {session.availableWords} palabras · Dificultad {LEVEL_LABELS[session.levelChoice].toLowerCase()}</GameText>
    {expanded && <View style={styles.column}><GameText>Longitud de Wordle</GameText>
    <Picker accessibilityLabel="Longitud de Wordle" selectedValue={session.filters.length ?? 'all'} onValueChange={value => session.changeFilters({ ...session.filters, length: Number(value) || null })} {...pickerProps}><Picker.Item label="Todas las longitudes" value="all" />{[4, 5, 6, 7].map(length => <Picker.Item key={length} label={`${length} letras`} value={length} />)}</Picker>
    <GameText>Categoría de Wordle</GameText><Picker accessibilityLabel="Categoría de Wordle" selectedValue={session.filters.category ?? 'all'} onValueChange={value => session.changeFilters({ ...session.filters, category: value === 'all' ? null : String(value) })} {...pickerProps}><Picker.Item label="Todas las categorías" value="all" />{WORD_CATEGORIES.map(category => <Picker.Item key={category} label={category} value={category} />)}</Picker>
    <LiveMessage text={session.availableWords ? `${session.availableWords} palabras disponibles con estos filtros.` : 'No hay palabras con estos filtros. Cambia la longitud o la categoría.'} />
    <GameText>Dificultad de los versículos</GameText><Picker accessibilityLabel="Dificultad de los versículos" selectedValue={session.levelChoice} onValueChange={value => session.changeLevel(value as LevelChoice)} {...pickerProps}>{Object.entries(LEVEL_LABELS).map(([key, label]) => <Picker.Item key={key} label={label} value={key} />)}</Picker>
    <GameText muted>El nivel inicial usa pasajes cortos. El automático se ajusta según tus últimas partidas de completar y ordenar.</GameText></View>}
  </GameCard>;
}
export function SavedRounds({ session }: { session: GamesSession }) {
  if (!session.savedRounds.length) return null;
  return <View style={styles.column}><GameText heading>Continúa donde te quedaste</GameText>{session.savedRounds.map(round => <GameCard key={round.id}><GameText>{GAME_CATALOG.find(game => game.id === round.game)?.title}</GameText><GameText muted>{round.settings.mode === 'daily' ? `Reto del ${round.settings.dailyDate}` : round.settings.mode === 'review' ? 'Repaso de errores' : 'Partida libre'}{round.settings.level ? ` · ${LEVEL_LABELS[round.settings.level]}` : ''}</GameText><View style={styles.row}><GameButton label="Continuar" onPress={() => session.resume(round)} /><GameButton secondary label="Descartar" onPress={() => session.discard(round.id)} /></View></GameCard>)}</View>;
}
export function ProgressSync({ session, signedIn }: { session: GamesSession; signedIn: boolean }) {
  return <View style={styles.column}><LiveMessage text={!signedIn ? 'Como visitante, tu progreso se guarda en este dispositivo.' : session.syncing ? 'Sincronizando tu progreso…' : session.pending || session.syncError ? 'Guardado aquí · pendiente de sincronizar' : session.lastSync ? 'Progreso guardado en tu cuenta' : 'Preparando la sincronización…'} />{signedIn && <GameButton secondary label="Sincronizar ahora" disabled={session.syncing || !session.ready} onPress={() => void session.sync()} />}{!!session.syncError && <LiveMessage text={session.syncError} />}</View>;
}
export function WeeklyProgress({ session }: { session: GamesSession }) {
  const { colors } = useAppTheme();
  const week = session.week;
  const dayLabel = (day: string) => new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
  return <View style={styles.column}>
    <GameText heading>Tu semana de práctica</GameText><GameText muted>Del {week.days[0].day} al {session.today}, con las fechas de Ciudad de México.</GameText>
    <View style={{ flexDirection: 'row', gap: 4 }}>{week.days.map(({ day, count }) => <View key={day} accessible accessibilityLabel={`${day}: ${count} actividades completadas`} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: count ? colors.primarySoft : colors.card, borderWidth: 1, borderColor: colors.border }}><GameText muted>{dayLabel(day)}</GameText><GameText>{count}</GameText></View>)}</View>
    <GameCard><GameText>{week.played} partidas · {week.points} puntos</GameText><GameText>{week.reviews} repasos completados</GameText><GameText>{week.correct} de {week.answers} respuestas correctas</GameText></GameCard>
    <GameCard><GameText heading>Lo que recordaste</GameText>{week.learned.length ? week.learned.map(title => <GameText key={title}>{title}</GameText>) : <GameText muted>Resuelve una palabra o un versículo y aquí verás lo que practicaste.</GameText>}</GameCard>
    <GameCard><GameText heading>Temas para reforzar</GameText>{week.topics.length ? week.topics.map(topic => <GameText key={topic.name}>{topic.name} · {topic.count} pendientes</GameText>) : <GameText muted>No tienes temas pendientes de repaso.</GameText>}</GameCard>
    <GameText muted>Las partidas antiguas conservan sus totales. Este resumen registra la actividad desde esta actualización; repetir un reto diario no vuelve a sumar puntos.</GameText>
  </View>;
}
