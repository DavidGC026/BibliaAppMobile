import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FeedPostCard } from '@/components/FeedPostCard';
import { GuestPrompt } from '@/components/GuestPrompt';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { FeedPost } from '@/lib/types';

type FeedType = 'following' | 'explore';

export default function FeedScreen() {
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedType, setFeedType] = useState<FeedType>('following');
  const [newPost, setNewPost] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    try {
      setError(null);
      const { feed } = await api.getFeed(feedType);
      setPosts(feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el feed');
    }
  };

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    loadFeed().finally(() => setLoading(false));
  }, [authLoading, isGuest, feedType]);

  const publish = async () => {
    const content = newPost.trim();
    if (!content) return;
    setPublishing(true);
    try {
      await api.createFeedPost(content);
      setNewPost('');
      await loadFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar');
    } finally {
      setPublishing(false);
    }
  };

  const updatePost = (updated: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
      <GuestPrompt
        title="Comunidad"
        message="Inicia sesión para ver publicaciones de personas que sigues."
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
      data={posts}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            await loadFeed();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Card style={styles.segmentCard}>
            <View style={styles.segment}>
              {(['following', 'explore'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.segmentBtn,
                    { borderRadius: radius.md },
                    feedType === type && { backgroundColor: colors.primarySoft },
                  ]}
                  onPress={() => setFeedType(type)}
                >
                  <Text style={{ color: feedType === type ? colors.primary : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                    {type === 'following' ? 'Siguiendo' : 'Explorar'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card style={styles.compose}>
            <TextInput
              style={[styles.composeInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.lg }]}
              placeholder="¿Qué quieres compartir?"
              placeholderTextColor={colors.textMuted}
              value={newPost}
              onChangeText={setNewPost}
              multiline
            />
            <Button
              label={publishing ? 'Publicando…' : 'Publicar'}
              onPress={publish}
              disabled={publishing || !newPost.trim()}
              loading={publishing}
              style={{ alignSelf: 'flex-end' }}
            />
          </Card>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {error ?? 'No hay publicaciones todavía.'}
          </Text>
        )
      }
      renderItem={({ item }) => <FeedPostCard post={item} onUpdate={updatePost} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, flexGrow: 1 },
  header: { gap: 12, marginBottom: 4 },
  segmentCard: { padding: 4 },
  segment: { flexDirection: 'row', gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  compose: { gap: 10 },
  composeInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 72, textAlignVertical: 'top' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});
