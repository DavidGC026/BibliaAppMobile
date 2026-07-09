import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActivityPanel } from '@/components/ActivityPanel';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { QuickActionCard } from '@/components/ui/QuickActionCard';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VerseOfDayCard } from '@/components/VerseOfDayCard';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { pickFeaturedDevotional, parseDevotionalContent } from '@/lib/devotional';
import type { ChurchEvent, Devotional, FeedAnnouncement } from '@/lib/types';

function goBible(mode: 'reader' | 'search' | 'dictionary' = 'reader', strong?: string) {
  router.push({
    pathname: '/(tabs)/bible',
    params: strong ? { mode, strong } : { mode },
  });
}

export default function HomeScreen() {
  const { colors, typography, spacing } = useAppTheme();
  const contentPadding = useContentPadding();
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const [churchName, setChurchName] = useState('BibliaAPP');
  const [notebookCount, setNotebookCount] = useState(0);
  const [highlightCount, setHighlightCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [devotionalCount, setDevotionalCount] = useState(0);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [announcements, setAnnouncements] = useState<FeedAnnouncement[]>([]);
  const [recentDevotionals, setRecentDevotionals] = useState<Devotional[]>([]);
  const [featuredDevotional, setFeaturedDevotional] = useState<Devotional | null>(null);

  useEffect(() => {
    if (authLoading || isGuest) return;

    api.getChurchSettings().then(({ settings }) => setChurchName(settings.church_name || 'BibliaAPP')).catch(() => {});
    api.listNotebooks().then(({ notebooks }) => setNotebookCount(notebooks.length)).catch(() => {});
    api.getAllHighlights().then(({ highlights }) => setHighlightCount(highlights.length)).catch(() => {});
    api.listFavorites().then(({ favorites }) => setFavoriteCount(favorites.length)).catch(() => {});
    api.listDevotionals().then(({ devotionals }) => {
      setDevotionalCount(devotionals.length);
      setFeaturedDevotional(pickFeaturedDevotional(devotionals));
      const sorted = [...devotionals].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRecentDevotionals(sorted.slice(0, 3));
    }).catch(() => {});
  }, [authLoading, isGuest]);

  useEffect(() => {
    api.getFeedAnnouncements().then(({ announcements: list }) => setAnnouncements(list.slice(0, 5))).catch(() => {});
    api.listChurchEvents().then(({ events: list }) => {
      const now = Date.now();
      setEvents(list.filter((e) => new Date(e.start_time).getTime() >= now).slice(0, 3));
    }).catch(() => {});
  }, []);

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'hermano';
  const spiritualProgress = devotionalCount > 0 ? 'Constante' : 'Iniciando';
  const featuredPreview = featuredDevotional ? parseDevotionalContent(featuredDevotional) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { gap: spacing['2xl'], paddingBottom: contentPadding }]}
    >
      <View style={styles.hero}>
        <Text style={[typography.h1, { color: colors.text }]}>
          {isGuest ? '¡Bienvenido a BibliaAPP!' : `¡Hola, ${firstName}!`}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isGuest
            ? 'Explora la Biblia y el versículo del día. Inicia sesión para guardar notas.'
            : `Te damos la bienvenida a ${churchName}.`}
        </Text>
      </View>

      {isGuest ? (
        <Card style={[styles.guestBanner, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
          <View style={styles.guestRow}>
            <View style={[styles.guestIcon, { backgroundColor: `${colors.primary}18` }]}>
              <SymbolView name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} tintColor={colors.primary} size={20} />
            </View>
            <View style={styles.guestText}>
              <Text style={[styles.guestTitle, { color: colors.text }]}>Modo exploración</Text>
              <Text style={[styles.guestDesc, { color: colors.textMuted }]}>
                Puedes leer la Biblia y buscar versículos. Para notas, favoritos y devocionales necesitas una cuenta.
              </Text>
            </View>
          </View>
          <Button label="Iniciar sesión" onPress={() => router.push('/login')} fullWidth />
        </Card>
      ) : null}

      <VerseOfDayCard />

      {!isGuest && featuredDevotional ? (
        <Card
          onPress={() => router.push(`/devotional/read/${featuredDevotional.id}`)}
          style={[styles.featuredDevotional, { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft }]}
        >
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Tu devocional
          </Text>
          <Text style={[styles.devTitle, { color: colors.text }]} numberOfLines={1}>
            {featuredDevotional.title}
          </Text>
          {featuredDevotional.verseRef ? (
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
              {featuredDevotional.verseRef}
            </Text>
          ) : null}
          {featuredPreview?.reflection ? (
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }} numberOfLines={3}>
              {featuredPreview.reflection}
            </Text>
          ) : null}
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 4 }}>
            Leer devocional →
          </Text>
        </Card>
      ) : null}

      {announcements.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Anuncios oficiales</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
            {announcements.map((a) => (
              <Card key={a.id} style={[styles.announceCard, { borderColor: '#F59E0B40', backgroundColor: '#F59E0B0D' }]}>
                <Text style={[styles.announceMeta, { color: '#B45309' }]}>Anuncio · {a.user_name}</Text>
                <Text style={[styles.announceText, { color: colors.text }]} numberOfLines={4}>
                  {a.content}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 6 }}>
                  {new Date(a.created_at).toLocaleDateString('es')}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {events.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Próximos eventos</Text>
            <Pressable onPress={() => router.push('/events')}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Ver calendario →</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsRow}>
            {events.map((ev) => (
              <Card key={ev.id} onPress={() => router.push('/events')} style={styles.eventCard}>
                <Text style={[styles.eventCat, { color: '#7C3AED' }]}>{ev.category ?? 'Evento'}</Text>
                <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>{ev.title}</Text>
                <Text style={[styles.eventDate, { color: colors.textMuted }]}>
                  {new Date(ev.start_time).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {!isGuest ? (
        <>
          <View style={styles.statsGrid}>
            <StatCard
              icon={{ ios: 'note.text', android: 'edit_note', web: 'edit_note' }}
              value={String(notebookCount)}
              label="Libretas creadas"
              onPress={() => router.push('/(tabs)/notes')}
            />
            <StatCard
              icon={{ ios: 'highlighter', android: 'border_color', web: 'border_color' }}
              value={String(highlightCount)}
              label="Subrayados"
              onPress={() => router.push('/highlights')}
            />
            <StatCard
              icon={{ ios: 'star.fill', android: 'star', web: 'star' }}
              value={String(favoriteCount)}
              label="Favoritos"
              onPress={() => router.push('/favorites')}
            />
            <StatCard
              icon={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
              value={String(devotionalCount)}
              label="Devocionales"
              onPress={() => router.push('/(tabs)/notes')}
            />
            <StatCard
              icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
              value={spiritualProgress}
              label="Progreso espiritual"
            />
            <StatCard
              icon={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              value={`${user?.streakCount ?? 0}`}
              label="Días de racha"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Actividad</Text>
              <Pressable onPress={() => router.push('/activity')}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Ver todo →</Text>
              </Pressable>
            </View>
            <ActivityPanel compact onViewAll={() => router.push('/activity')} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Estadísticas</Text>
              <Pressable onPress={() => router.push('/statistics')}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Ver todo →</Text>
              </Pressable>
            </View>
            <StatisticsPanel compact onViewAll={() => router.push('/statistics')} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Devocionales recientes</Text>
              <Pressable onPress={() => router.push('/(tabs)/notes')}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Ver diario →</Text>
              </Pressable>
            </View>
            {recentDevotionals.length === 0 ? (
              <Card style={styles.emptyCard} dashed>
                <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
                  Aún no has escrito devocionales en tu diario espiritual.
                </Text>
                <Pressable onPress={() => router.push('/devotional/new')} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>Escribir el primero</Text>
                </Pressable>
              </Card>
            ) : (
              recentDevotionals.map((dev) => (
                <Card key={dev.id} onPress={() => router.push(`/devotional/read/${dev.id}`)} style={styles.devCard}>
                  <View style={[styles.devBadge, { backgroundColor: colors.primarySoft }]}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>
                      {dev.emotion || 'Sin emoción'}
                    </Text>
                  </View>
                  <Text style={[styles.devTitle, { color: colors.text }]} numberOfLines={1}>{dev.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                    Pasaje: {dev.verseRef || 'N/A'}
                  </Text>
                </Card>
              ))
            )}
          </View>
        </>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones rápidas</Text>
        <View style={styles.actions}>
          <QuickActionCard
            icon={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
            title="Ir a lectura"
            description="Lee la Biblia capítulo a capítulo"
            onPress={() => goBible('reader')}
          />
          <QuickActionCard
            icon={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            title="Buscador avanzado"
            description="Busca versículos y palabras clave"
            onPress={() => goBible('search')}
          />
          <QuickActionCard
            icon={{ ios: 'note.text', android: 'edit_note', web: 'edit_note' }}
            title="Mis notas"
            description={isGuest ? 'Requiere iniciar sesión' : 'Cuadernos y libretas personales'}
            locked={isGuest}
            onPress={() => (isGuest ? router.push('/login') : router.push('/(tabs)/notes'))}
          />
          <QuickActionCard
            icon={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
            title="Estadísticas"
            description={isGuest ? 'Requiere iniciar sesión' : 'Progreso de lectura por libro'}
            locked={isGuest}
            onPress={() => (isGuest ? router.push('/login') : router.push('/statistics'))}
          />
          <QuickActionCard
            icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            title="Actividad"
            description={isGuest ? 'Requiere iniciar sesión' : 'Calendario y progreso reciente'}
            locked={isGuest}
            onPress={() => (isGuest ? router.push('/login') : router.push('/activity'))}
          />
          <QuickActionCard
            icon={{ ios: 'character.book.closed.fill', android: 'menu_book', web: 'menu_book' }}
            title="Diccionario Strong"
            description="Códigos griegos y hebreos del texto bíblico"
            onPress={() => goBible('dictionary')}
          />
          <QuickActionCard
            icon={{ ios: 'person.2.fill', android: 'groups', web: 'groups' }}
            title="Comunidad"
            description={isGuest ? 'Requiere iniciar sesión' : 'Publicaciones de tu iglesia'}
            locked={isGuest}
            onPress={() => (isGuest ? router.push('/login') : router.push('/(tabs)/feed'))}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  hero: { gap: 6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  guestBanner: { gap: 14 },
  guestRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  guestIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  guestText: { flex: 1, gap: 4 },
  guestTitle: { fontSize: 14, fontWeight: '700' },
  guestDesc: { fontSize: 12, lineHeight: 18 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  eventsRow: { gap: 12, paddingRight: 4 },
  eventCard: { width: 220, gap: 6 },
  announceCard: { width: 260, gap: 4, borderWidth: 1 },
  announceMeta: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  announceText: { fontSize: 14, lineHeight: 20 },
  eventCat: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  eventTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  eventDate: { fontSize: 11, marginTop: 4 },
  statsGrid: { gap: 10 },
  emptyCard: { paddingVertical: 24 },
  devCard: { gap: 6 },
  devBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  devTitle: { fontSize: 15, fontWeight: '700' },
  featuredDevotional: { gap: 8, borderWidth: 1 },
  actions: { gap: 10 },
});
