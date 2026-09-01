import { Href, Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GuestPrompt } from '@/components/GuestPrompt';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { FriendRequest, FriendUser } from '@/lib/types';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<FriendUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const [{ friends: list }, { requests: pending }] = await Promise.all([
      api.listFriends(),
      api.listPendingFriendRequests(),
    ]);
    setFriends(list);
    setRequests(pending);
  }, []);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load()
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isGuest, load]);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { users } = await api.searchUsers(q);
      setResults(users);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo buscar');
    } finally {
      setSearching(false);
    }
  };

  const respond = async (requesterId: number, action: 'accept' | 'reject') => {
    await api.respondFriendRequest(requesterId, action);
    await load();
  };

  const openProfile = (username: string | null, fallbackId?: number) => {
    if (username) router.push(`/user/${encodeURIComponent(username)}` as Href);
    else if (fallbackId) Alert.alert('Sin apodo', 'Esta cuenta aún no tiene @usuario público.');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'friends', label: 'Amigos' },
    { key: 'requests', label: requests.length ? `Solicitudes (${requests.length})` : 'Solicitudes' },
    { key: 'search', label: 'Buscar' },
  ];

  if (isGuest) {
    return (
      <>
        <Stack.Screen options={{ title: 'Amigos' }} />
        <GuestPrompt title="Amigos" message="Inicia sesión para buscar personas, seguir y aceptar solicitudes." />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Amigos' }} />
      <SegmentTabs tabs={tabs} active={tab} onChange={setTab} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : tab === 'search' ? (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 10 }}
          data={results}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder="Nombre o @usuario"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => void search()}
                autoCapitalize="none"
              />
              <Button label={searching ? 'Buscando…' : 'Buscar'} onPress={() => void search()} loading={searching} fullWidth />
            </View>
          }
          ListEmptyComponent={<EmptyState title="Busca personas" message="Escribe al menos dos letras." />}
          renderItem={({ item }) => (
            <Card onPress={() => openProfile(item.username, item.id)}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
              {item.username ? <Text style={{ color: colors.primary }}>@{item.username}</Text> : null}
            </Card>
          )}
        />
      ) : tab === 'requests' ? (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: contentPadding }}
          data={requests}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => {
              setRefreshing(true);
              await load().finally(() => setRefreshing(false));
            }} />
          }
          ListEmptyComponent={<EmptyState title="Sin solicitudes" message="Cuando alguien te agregue, aparecerá aquí." />}
          renderItem={({ item }) => (
            <Card style={{ gap: 10, marginBottom: 12 }}>
              <Pressable onPress={() => openProfile(item.username, item.requester_id)}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.name}</Text>
                {item.username ? <Text style={{ color: colors.primary }}>@{item.username}</Text> : null}
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Aceptar" onPress={() => void respond(item.requester_id, 'accept')} />
                <Button label="Rechazar" variant="outline" onPress={() => void respond(item.requester_id, 'reject')} />
              </View>
            </Card>
          )}
        />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: contentPadding }}
          data={friends}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={async () => {
              setRefreshing(true);
              await load().finally(() => setRefreshing(false));
            }} />
          }
          ListEmptyComponent={<EmptyState title="Aún no tienes amigos" message="Búscalos por nombre o apodo." actionLabel="Buscar" onAction={() => setTab('search')} />}
          renderItem={({ item }) => (
            <Card onPress={() => openProfile(item.username, item.id)} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
              {item.username ? <Text style={{ color: colors.primary }}>@{item.username}</Text> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
