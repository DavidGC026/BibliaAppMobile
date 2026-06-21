import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GuestPrompt } from '@/components/GuestPrompt';
import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as api from '@/lib/api';
import type { ChurchEvent } from '@/lib/types';

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function EventCard({
  event,
  onRsvp,
  busy,
}: {
  event: ChurchEvent;
  onRsvp: (id: number, status: 'going' | 'maybe' | 'declined') => void;
  busy: boolean;
}) {
  const colors = useThemeColors();
  const isGroup = event.source === 'group';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
          {isGroup ? `Grupo · ${event.group_name ?? ''}` : event.category ?? 'Iglesia'}
        </Text>
      </View>
      <Text style={{ color: colors.primary, fontWeight: '600' }}>{formatDateTime(event.start_time)}</Text>
      {event.location ? <Text style={{ color: colors.textMuted }}>📍 {event.location}</Text> : null}
      {event.description ? (
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{event.description}</Text>
      ) : null}
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Por {event.creator_name}</Text>
      {!isGroup && event.going_count != null ? (
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{event.going_count} confirmados</Text>
      ) : null}
      {!isGroup ? (
        <View style={styles.rsvpRow}>
          {(['going', 'maybe', 'declined'] as const).map((status) => {
            const labels = { going: 'Voy', maybe: 'Tal vez', declined: 'No puedo' };
            const active = event.my_rsvp === status;
            return (
              <Pressable
                key={status}
                style={[
                  styles.rsvpBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: active ? colors.primarySoft : colors.background,
                  },
                ]}
                disabled={busy}
                onPress={() => onRsvp(event.id, status)}
              >
                <Text style={{ color: active ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
                  {labels[status]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function EventsScreen() {
  const colors = useThemeColors();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyRsvp, setBusyRsvp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { events: list } = await api.listChurchEvents();
    setEvents(list);
  }, []);

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [authLoading, isGuest, load]);

  const handleRsvp = async (eventId: number, status: 'going' | 'maybe' | 'declined') => {
    setBusyRsvp(eventId);
    try {
      await api.setEventRsvp(eventId, status);
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, my_rsvp: status } : e)),
      );
    } finally {
      setBusyRsvp(null);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <>
        <Stack.Screen options={{ title: 'Calendario' }} />
        <GuestPrompt title="Calendario" message="Inicia sesión para ver eventos de la iglesia y tus grupos." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Calendario' }} />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.list}
        data={events}
        keyExtractor={(item) => `${item.source}-${item.id}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await load();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {error ?? 'No hay eventos próximos.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <EventCard event={item} busy={busyRsvp === item.id} onRsvp={handleRsvp} />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, gap: 8 },
  cardHeader: { gap: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rsvpBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});
