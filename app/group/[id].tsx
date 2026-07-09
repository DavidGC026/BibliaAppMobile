import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FeedContent } from '@/components/FeedContent';
import { GroupHeader } from '@/components/GroupHeader';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { GroupEvent, GroupPost, GroupPrayer, GroupSummary } from '@/lib/types';

type GroupTab = 'prayers' | 'events' | 'activity';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function GroupDetailScreen() {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [tab, setTab] = useState<GroupTab>('prayers');
  const [prayers, setPrayers] = useState<GroupPrayer[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyPrayer, setBusyPrayer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTab = useCallback(async () => {
    if (!groupId || Number.isNaN(groupId)) return;
    if (tab === 'prayers') {
      const { prayers: list } = await api.getGroupPrayers(groupId);
      setPrayers(list);
    } else if (tab === 'events') {
      const { events: list } = await api.getGroupEvents(groupId);
      setEvents(list);
    } else {
      const { posts: list } = await api.getGroupPosts(groupId);
      setPosts(list);
    }
  }, [groupId, tab]);

  const loadAll = useCallback(async () => {
    if (!groupId || Number.isNaN(groupId)) return;
    setError(null);
    const { group: g } = await api.getGroup(groupId);
    setGroup(g);
    await loadTab();
  }, [groupId, loadTab]);

  useEffect(() => {
    setLoading(true);
    loadAll()
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [loadAll]);

  useEffect(() => {
    if (!loading) {
      loadTab().catch(() => {});
    }
  }, [tab, loadTab, loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  const intercede = async (prayerId: number) => {
    setBusyPrayer(prayerId);
    try {
      await api.joinPrayerIntercession(groupId, prayerId);
      await loadTab();
    } finally {
      setBusyPrayer(null);
    }
  };

  const tabs: { key: GroupTab; label: string }[] = [
    { key: 'prayers', label: 'Oración' },
    { key: 'events', label: 'Calendario' },
    { key: 'activity', label: 'Actividad' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: group?.name ?? 'Grupo' }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : (
          <>
            {group ? <GroupHeader group={group} /> : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.tabBar, { borderColor: colors.border }]}
              contentContainerStyle={styles.tabBarInner}
            >
              {tabs.map((t) => (
                <Pressable
                  key={t.key}
                  style={[
                    styles.tab,
                    tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setTab(t.key)}
                >
                  <Text
                    style={{
                      color: tab === t.key ? colors.primary : colors.textMuted,
                      fontWeight: '600',
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {tab === 'prayers' ? (
              <FlatList
                data={prayers}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: colors.textMuted }]}>
                    No hay peticiones de oración.
                  </Text>
                }
                renderItem={({ item: p }) => (
                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{p.title}</Text>
                    {p.description ? (
                      <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{p.description}</Text>
                    ) : null}
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                      {p.user_name} · {p.intercessor_count} intercesores
                    </Text>
                    {!p.is_interceding ? (
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        disabled={busyPrayer === p.id}
                        onPress={() => intercede(p.id)}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Orar por esto</Text>
                      </Pressable>
                    ) : (
                      <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                        Estás intercediendo
                      </Text>
                    )}
                  </View>
                )}
              />
            ) : tab === 'events' ? (
              <FlatList
                data={events}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: colors.textMuted }]}>
                    No hay eventos próximos.
                  </Text>
                }
                renderItem={({ item: e }) => (
                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{e.title}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                      {formatDate(e.start_time)}
                    </Text>
                    {e.location ? (
                      <Text style={{ color: colors.textMuted }}>📍 {e.location}</Text>
                    ) : null}
                    {e.description ? (
                      <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{e.description}</Text>
                    ) : null}
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      Por {e.creator_name}
                    </Text>
                  </View>
                )}
              />
            ) : (
              <FlatList
                data={posts}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                  <Text style={[styles.empty, { color: colors.textMuted }]}>
                    Sin publicaciones en el grupo.
                  </Text>
                }
                renderItem={({ item: post }) => (
                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{post.user_name}</Text>
                    <FeedContent content={post.content} />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {formatDate(post.created_at)}
                    </Text>
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, borderBottomWidth: 1, gap: 6 },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 13, fontWeight: '600' },
  tabBar: { borderBottomWidth: 1, maxHeight: 48 },
  tabBarInner: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 12 },
  list: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15 },
  error: { textAlign: 'center', marginTop: 40, padding: 16 },
});
