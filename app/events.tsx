import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { GuestPrompt } from '@/components/GuestPrompt';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { ChurchEvent } from '@/lib/types';

const CATEGORIES = [
  { id: 'culto', label: 'Culto' },
  { id: 'oracion', label: 'Oración' },
  { id: 'jovenes', label: 'Jóvenes' },
  { id: 'ministerio', label: 'Ministerio' },
  { id: 'otro', label: 'Otro' },
] as const;

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
  onDelete,
  busy,
  isAdmin,
}: {
  event: ChurchEvent;
  onRsvp: (id: number, status: 'going' | 'maybe' | 'declined') => void;
  onDelete: (id: number) => void;
  busy: boolean;
  isAdmin: boolean;
}) {
  const { colors } = useAppTheme();
  const isGroup = event.source === 'group';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
            {isGroup ? `Grupo · ${event.group_name ?? ''}` : CATEGORIES.find((c) => c.id === event.category)?.label ?? event.category ?? 'Iglesia'}
          </Text>
        </View>
        {isAdmin && !isGroup ? (
          <Pressable onPress={() => onDelete(event.id)} style={{ padding: 8 }}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={colors.danger} size={20} />
          </Pressable>
        ) : null}
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
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading, user } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyRsvp, setBusyRsvp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating event
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('culto');
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

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

  const handleDelete = (id: number) => {
    Alert.alert(
      'Eliminar evento',
      '¿Estás seguro de que deseas eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteChurchEvent(id);
              load().catch(() => {});
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar el evento');
            }
          },
        },
      ]
    );
  };

  const openCreateModal = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setStartDate(`${yyyy}-${mm}-${dd}`);
    setStartTime('18:00');
    setEndDate('');
    setEndTime('');
    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('culto');
    setIsCreating(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !startDate || !startTime) {
      Alert.alert('Campos requeridos', 'Por favor completa el título y la fecha/hora de inicio.');
      return;
    }
    setSaving(true);
    try {
      let startIso = '';
      try {
        const startDateTimeStr = startDate.includes('T') ? startDate : `${startDate}T${startTime}:00`;
        const startD = new Date(startDateTimeStr);
        if (isNaN(startD.getTime())) throw new Error();
        startIso = startD.toISOString();
      } catch {
        Alert.alert('Fecha inválida', 'La fecha u hora de inicio no es válida.');
        setSaving(false);
        return;
      }

      let endIso = null;
      if (endDate) {
        try {
          const endDateTimeStr = endDate.includes('T') ? endDate : `${endDate}T${endTime || '00:00'}:00`;
          const endD = new Date(endDateTimeStr);
          if (isNaN(endD.getTime())) throw new Error();
          endIso = endD.toISOString();
        } catch {
          Alert.alert('Fecha inválida', 'La fecha u hora de fin no es válida.');
          setSaving(false);
          return;
        }
      }

      await api.createChurchEvent({
        title: title.trim(),
        description: description.trim(),
        startTime: startIso,
        endTime: endIso,
        location: location.trim(),
        category,
      });

      setIsCreating(false);
      load().catch(() => {});
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo crear el evento');
    } finally {
      setSaving(false);
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
      <Stack.Screen
        options={{
          title: 'Calendario',
          headerRight: () =>
            isAdmin ? (
              <Pressable onPress={openCreateModal} style={{ marginRight: 16, padding: 4 }}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor={colors.primary} size={24} />
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
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
          <EventCard
            event={item}
            busy={busyRsvp === item.id}
            onRsvp={handleRsvp}
            onDelete={handleDelete}
            isAdmin={isAdmin}
          />
        )}
      />

      <Modal visible={isCreating} animationType="slide" transparent onRequestClose={() => setIsCreating(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nuevo Evento</Text>
                <Pressable onPress={() => setIsCreating(false)} style={{ padding: 4 }}>
                  <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} tintColor={colors.textMuted} size={22} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: colors.textMuted }]}>TÍTULO</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                  placeholder="Título del evento"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>DESCRIPCIÓN</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                  placeholder="Descripción del evento (opcional)"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>FECHA INICIO</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor={colors.textMuted}
                      value={startDate}
                      onChangeText={setStartDate}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>HORA INICIO</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textMuted}
                      value={startTime}
                      onChangeText={setStartTime}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>FECHA FIN (OPCIONAL)</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor={colors.textMuted}
                      value={endDate}
                      onChangeText={setEndDate}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>HORA FIN</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.textMuted}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>UBICACIÓN</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.background }]}
                  placeholder="Lugar del evento"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>CATEGORÍA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {CATEGORIES.map((cat) => {
                    const selected = category === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.background,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? colors.primaryForeground : colors.text,
                            fontWeight: '600',
                            fontSize: 13,
                          }}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={{ height: 20 }} />

                <Button label="Publicar Evento" onPress={handleCreate} loading={saving} disabled={saving} fullWidth />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rsvpBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

