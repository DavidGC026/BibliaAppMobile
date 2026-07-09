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
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { AppNotification } from '@/lib/types';

function notificationLabel(n: AppNotification): string {
  const who = n.actor_name || 'Alguien';
  switch (n.type) {
    case 'like':
      return `${who} le gustó tu publicación`;
    case 'comment':
      return `${who} comentó tu publicación`;
    case 'reply':
      return `${who} respondió tu comentario`;
    case 'follow':
      return `${who} te sigue`;
    case 'friend_request':
      return `${who} te envió solicitud de amistad`;
    case 'friend_accepted':
      return `${who} aceptó tu solicitud`;
    case 'group_event_reminder':
      return n.event_title ? `Evento: ${n.event_title}` : 'Recordatorio de evento';
    case 'prayer_intercession':
      return `${who} ora contigo`;
    default:
      return `${who} — ${n.type}`;
  }
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.getNotifications();
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [authLoading, isGuest, load]);

  const markAllRead = async () => {
    await api.markNotificationsRead('all');
    await load();
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
        <Stack.Screen options={{ title: 'Notificaciones' }} />
        <GuestPrompt title="Notificaciones" message="Inicia sesión para ver tus alertas." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notificaciones' }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {unreadCount > 0 ? (
          <Pressable style={[styles.markAll, { borderColor: colors.border }]} onPress={markAllRead}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              Marcar {unreadCount} como leídas
            </Text>
          </Pressable>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                No tienes notificaciones.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: item.read_at ? colors.card : colors.primarySoft,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardText, { color: colors.text }]}>
                {notificationLabel(item)}
              </Text>
              {item.post_preview ? (
                <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={2}>
                  "{item.post_preview}"
                </Text>
              ) : null}
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {new Date(item.created_at).toLocaleString('es-ES')}
              </Text>
            </View>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markAll: {
    padding: 14,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  list: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, gap: 4 },
  cardText: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40 },
});
