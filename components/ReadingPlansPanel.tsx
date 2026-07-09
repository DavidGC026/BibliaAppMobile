import { useEffect, useState } from 'react';
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
import type { ReadingPlan, UserReadingPlan } from '@/lib/types';

function parseProgress(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ReadingPlansPanel() {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [userPlans, setUserPlans] = useState<UserReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const data = await api.getReadingPlans();
    setPlans(data.plans);
    setUserPlans(data.userPlans);
  };

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, isGuest]);

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
    const done = parseProgress(up.progress);
    const next = done.includes(day) ? done.filter((d) => d !== day) : [...done, day];
    setBusyId(up.planId);
    try {
      await api.updatePlanProgress(up.planId, next);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
    >
      {userPlans.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.textMuted }]}>Mis planes</Text>
          {userPlans.map((up) => {
            const done = parseProgress(up.progress);
            const pct = up.durationDays
              ? Math.round((done.length / up.durationDays) * 100)
              : 0;
            return (
              <View
                key={up.planId}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.name, { color: colors.text }]}>{up.name}</Text>
                {up.description ? (
                  <Text style={[styles.desc, { color: colors.textMuted }]}>{up.description}</Text>
                ) : null}
                <Text style={[styles.progress, { color: colors.primary }]}>
                  {done.length}/{up.durationDays} días · {pct}%
                </Text>
                <View style={styles.daysRow}>
                  {Array.from({ length: Math.min(up.durationDays, 14) }, (_, i) => i + 1).map(
                    (day) => (
                      <Pressable
                        key={day}
                        disabled={busyId === up.planId}
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor: done.includes(day)
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                        onPress={() => handleToggleDay(up, day)}
                      >
                        <Text
                          style={{
                            color: done.includes(day) ? '#FFF' : colors.textMuted,
                            fontSize: 11,
                            fontWeight: '600',
                          }}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    ),
                  )}
                  {up.durationDays > 14 ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>+{up.durationDays - 14}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      ) : null}

      <Text style={[styles.section, { color: colors.textMuted }]}>Planes disponibles</Text>
      {plans.map((plan) => {
        const joined = userPlans.some((u) => u.planId === plan.id || u.id === plan.id);
        return (
          <View
            key={plan.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.name, { color: colors.text }]}>{plan.name}</Text>
            {plan.description ? (
              <Text style={[styles.desc, { color: colors.textMuted }]}>{plan.description}</Text>
            ) : null}
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {plan.durationDays} días
            </Text>
            {!joined ? (
              <Pressable
                style={[styles.joinBtn, { backgroundColor: colors.primary }]}
                disabled={busyId === plan.id}
                onPress={() => handleJoin(plan.id)}
              >
                {busyId === plan.id ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.joinText}>Unirme</Text>
                )}
              </Pressable>
            ) : (
              <Text style={[styles.joinedLabel, { color: colors.primary }]}>Ya estás inscrito</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 8 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10, gap: 6 },
  name: { fontSize: 17, fontWeight: '700' },
  desc: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13 },
  progress: { fontSize: 14, fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  joinText: { color: '#FFF', fontWeight: '600' },
  joinedLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});
