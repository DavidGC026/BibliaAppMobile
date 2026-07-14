import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GuestPrompt } from '@/components/GuestPrompt';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import {
  findPlanDevotional,
  formatPlanReadings,
  nextPendingDay,
  parsePlanDays,
  parsePlanProgress,
  type PlanDay,
} from '@/lib/readingPlans';
import type { Devotional, ReadingPlan, UserReadingPlan } from '@/lib/types';

export function ReadingPlansPanel() {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [userPlans, setUserPlans] = useState<UserReadingPlan[]>([]);
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const loadedRef = useRef(false);

  const load = async () => {
    const [data, devs] = await Promise.all([
      api.getReadingPlans(),
      api.listDevotionals().catch(() => ({ devotionals: [] as Devotional[] })),
    ]);
    setPlans(data.plans);
    setUserPlans(data.userPlans);
    setDevotionals(devs.devotionals);
    loadedRef.current = true;
  };

  const reload = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los planes.'))
      .finally(() => setLoading(false));
  };

  // Recargar al volver de escribir un devocional o del lector (sin spinner si ya hay datos)
  useFocusEffect(
    useCallback(() => {
      if (authLoading || isGuest) return;
      reload(!loadedRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isGuest]),
  );

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <GuestPrompt
        title="Planes de lectura"
        message="Inicia sesión para unirte a planes y registrar tu progreso."
      />
    );
  }

  const handleJoin = async (planId: number) => {
    setBusyId(planId);
    try {
      await api.joinReadingPlan(planId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleDay = async (up: UserReadingPlan, day: number) => {
    const done = parsePlanProgress(up.progress);
    const next = done.includes(day)
      ? done.filter((d) => d !== day)
      : [...done, day].sort((a, b) => a - b);
    setBusyId(up.planId);
    try {
      await api.updatePlanProgress(up.planId, next);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const openReading = (dayInfo: PlanDay) => {
    const rd = dayInfo.readings[0];
    if (!rd) return;
    router.navigate({
      pathname: '/(tabs)/bible',
      params: { bookId: String(rd.bookId), chapter: String(rd.chapters[0]) },
    });
  };

  const openDevotional = (up: UserReadingPlan, dayInfo: PlanDay) => {
    const existing = findPlanDevotional(devotionals, up.planId, dayInfo.day);
    if (existing) {
      router.push({ pathname: '/devotional/read/[id]', params: { id: String(existing.id) } });
      return;
    }
    router.push({
      pathname: '/devotional/[id]',
      params: {
        id: 'new',
        planId: String(up.planId),
        planDay: String(dayInfo.day),
        planTitle: `Devocional: ${up.name} - Día ${dayInfo.day}`,
        planVerseRef: formatPlanReadings(dayInfo.readings),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Planes de lectura</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{error}</Text>
        <Pressable style={[styles.joinBtn, { backgroundColor: colors.primary }]} onPress={() => reload()}>
          <Text style={[styles.joinText, { color: colors.primaryForeground }]}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (plans.length === 0 && userPlans.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Aún no hay planes</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Todavía no hay planes de lectura disponibles. Vuelve más tarde para unirte a uno y seguir tu progreso.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
    >
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
          <SymbolView name={{ ios: 'book.pages', android: 'auto_stories', web: 'menu_book' }} tintColor={colors.primary} size={24} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Planes de lectura</Text>
          <Text style={[styles.heroText, { color: colors.textMuted }]}>Avanza a tu ritmo y convierte cada lectura en un hábito.</Text>
        </View>
        {userPlans.length > 0 ? (
          <View style={[styles.activeBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.activeBadgeValue, { color: colors.primary }]}>{userPlans.length}</Text>
            <Text style={[styles.activeBadgeLabel, { color: colors.primary }]}>activos</Text>
          </View>
        ) : null}
      </View>

      {userPlans.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>En curso</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
              {userPlans.length} {userPlans.length === 1 ? 'plan' : 'planes'}
            </Text>
          </View>
          {userPlans.map((up) => {
            const done = parsePlanProgress(up.progress);
            const days = parsePlanDays(up.chaptersData);
            const pct = up.durationDays ? Math.round((done.length / up.durationDays) * 100) : 0;
            const today = nextPendingDay(days, done);
            const isExpanded = expandedPlanId === up.planId;
            const busy = busyId === up.planId;
            const todayDevotional = today ? findPlanDevotional(devotionals, up.planId, today.day) : null;

            return (
              <View
                key={up.planId}
                style={[styles.card, styles.activeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.planHeading}>
                  <View style={[styles.planIcon, { backgroundColor: colors.primarySoft }]}>
                    <SymbolView name={{ ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }} tintColor={colors.primary} size={17} />
                  </View>
                  <View style={styles.planHeadingCopy}>
                    <Text style={[styles.name, { color: colors.text }]}>{up.name}</Text>
                    <Text style={[styles.planPace, { color: colors.textMuted }]}>{up.durationDays} días de lectura</Text>
                  </View>
                  <Text style={[styles.percent, { color: colors.primary }]}>{pct}%</Text>
                </View>
                {up.description ? (
                  <Text style={[styles.desc, { color: colors.textMuted }]}>{up.description}</Text>
                ) : null}

                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Tu progreso</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>{done.length} de {up.durationDays} días</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, pct)}%` }]}
                  />
                </View>

                {today ? (
                  <View style={[styles.todayBox, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
                    <View style={styles.todayHeading}>
                      <View style={[styles.todayIcon, { backgroundColor: colors.card }]}>
                        <SymbolView name={{ ios: 'sun.max.fill', android: 'wb_sunny', web: 'light_mode' }} tintColor={colors.primary} size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.todayLabel, { color: colors.primary }]}>SIGUIENTE LECTURA</Text>
                        <Text style={[styles.todayDay, { color: colors.textMuted }]}>Día {today.day} de {up.durationDays}</Text>
                      </View>
                    </View>
                    <Text style={[styles.todayReading, { color: colors.text }]}>
                      {formatPlanReadings(today.readings)}
                    </Text>
                    <View style={styles.todayActions}>
                      <Pressable
                        style={[styles.todayBtn, { backgroundColor: colors.primary }]}
                        onPress={() => openReading(today)}
                      >
                        <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={colors.primaryForeground} size={15} />
                        <Text style={[styles.joinText, { color: colors.primaryForeground }]}>Leer ahora</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.todayBtnOutline, { borderColor: colors.primaryBorder, backgroundColor: colors.card }]}
                        disabled={busy}
                        onPress={() => handleToggleDay(up, today.day)}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>✓ Completar</Text>
                        )}
                      </Pressable>
                      <Pressable
                        style={[styles.devotionalAction, { borderTopColor: colors.primaryBorder }]}
                        onPress={() => openDevotional(up, today)}
                      >
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                          {todayDevotional ? 'Ver devocional' : 'Escribir devocional'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.todayBox, styles.completedBox, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
                    <SymbolView name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }} tintColor={colors.primary} size={28} />
                    <Text style={[styles.completedTitle, { color: colors.text }]}>Plan completado</Text>
                    <Text style={[styles.todayReading, { color: colors.textMuted }]}>
                      Terminaste los {up.durationDays} días. ¡Felicidades!
                    </Text>
                  </View>
                )}

                <Pressable
                  style={[styles.expandBtn, { borderTopColor: colors.border }]}
                  onPress={() => setExpandedPlanId(isExpanded ? null : up.planId)}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                    {isExpanded ? 'Ocultar calendario' : 'Ver calendario completo'}
                  </Text>
                  <SymbolView name={isExpanded ? { ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' } : { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }} tintColor={colors.textMuted} size={15} />
                </Pressable>

                {isExpanded ? (
                  <View style={[styles.daysList, { borderTopColor: colors.border }]}>
                    {days.map((d) => {
                      const isDone = done.includes(d.day);
                      const dayDev = findPlanDevotional(devotionals, up.planId, d.day);
                      const isToday = today?.day === d.day;
                      return (
                        <View key={d.day} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
                          <Pressable
                            disabled={busy}
                            onPress={() => handleToggleDay(up, d.day)}
                            style={[
                              styles.dayCheck,
                              {
                                backgroundColor: isDone ? colors.primary : 'transparent',
                                borderColor: isDone ? colors.primary : colors.border,
                              },
                            ]}
                            hitSlop={6}
                          >
                            {isDone ? <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '800' }}>✓</Text> : null}
                          </Pressable>
                          <Pressable style={styles.dayInfo} onPress={() => openReading(d)}>
                            <Text
                              style={{
                                color: isToday ? colors.primary : colors.textMuted,
                                fontSize: 11,
                                fontWeight: '700',
                              }}
                            >
                              Día {d.day}
                              {isToday ? ' · Hoy' : ''}
                            </Text>
                            <Text
                              style={{
                                color: isDone ? colors.textMuted : colors.text,
                                fontSize: 14,
                                fontWeight: isDone ? '400' : '600',
                                textDecorationLine: isDone ? 'line-through' : 'none',
                              }}
                              numberOfLines={2}
                            >
                              {formatPlanReadings(d.readings)}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => openDevotional(up, d)} hitSlop={6}>
                            <Text style={{ color: dayDev ? colors.primary : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                              {dayDev ? '📖' : '+ Dev.'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Descubre nuevos planes</Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{plans.length} disponibles</Text>
      </View>
      {plans.map((plan) => {
        const joined = userPlans.some((u) => u.planId === plan.id || u.id === plan.id);
        return (
          <View
            key={plan.id}
            style={[styles.card, styles.availableCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.availableHeading}>
              <View style={[styles.availableIcon, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                <SymbolView name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} tintColor={colors.primary} size={18} />
              </View>
              <View style={styles.planHeadingCopy}>
                <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{plan.durationDays} días · Lecturas diarias</Text>
              </View>
            </View>
            {plan.description ? (
              <Text style={[styles.desc, { color: colors.textMuted }]}>{plan.description}</Text>
            ) : null}
            {!joined ? (
              <Pressable
                style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                disabled={busyId === plan.id}
                onPress={() => handleJoin(plan.id)}
              >
                {busyId === plan.id ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Text style={[styles.joinText, { color: colors.primaryForeground }]}>Comenzar plan</Text>
                    <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} tintColor={colors.primaryForeground} size={16} />
                  </>
                )}
              </Pressable>
            ) : (
              <View style={[styles.joinedBadge, { backgroundColor: colors.primarySoft }]}>
                <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} tintColor={colors.primary} size={15} />
                <Text style={[styles.joinedLabel, { color: colors.primary }]}>Ya está en tus planes</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  content: { padding: 16, gap: 10 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 4 },
  heroIcon: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.25 },
  heroText: { fontSize: 12, lineHeight: 17 },
  activeBadge: { minWidth: 46, borderRadius: 13, paddingHorizontal: 8, paddingVertical: 7, alignItems: 'center' },
  activeBadgeValue: { fontSize: 16, lineHeight: 18, fontWeight: '800' },
  activeBadgeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 10, marginBottom: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 8, gap: 10 },
  activeCard: { paddingTop: 15 },
  availableCard: { gap: 12 },
  planHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planHeadingCopy: { flex: 1, gap: 2 },
  planIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  planPace: { fontSize: 11, fontWeight: '500' },
  percent: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  name: { fontSize: 17, fontWeight: '700', letterSpacing: -0.15 },
  desc: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  progressLabel: { fontSize: 11, fontWeight: '600' },
  progressValue: { fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  todayBox: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 9, marginTop: 2 },
  todayHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  todayIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todayLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  todayDay: { fontSize: 11, marginTop: 1 },
  todayReading: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  todayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  todayBtn: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnOutline: {
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devotionalAction: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 1 },
  completedBox: { alignItems: 'center', paddingVertical: 18 },
  completedTitle: { fontSize: 16, fontWeight: '800' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 2, paddingTop: 12, paddingBottom: 2 },
  daysList: { borderTopWidth: 1, marginTop: 2 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInfo: { flex: 1, gap: 1 },
  availableHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  availableIcon: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  joinBtn: {
    marginTop: 2,
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: { fontWeight: '700' },
  joinedBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  joinedLabel: { fontSize: 12, fontWeight: '700' },
});
