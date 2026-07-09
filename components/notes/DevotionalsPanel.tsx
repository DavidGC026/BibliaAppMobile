import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { DEVOTIONAL_EMOTIONS, parseDevotionalContent } from '@/lib/devotional';
import type { Devotional } from '@/lib/types';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function DevotionalsPanel() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const [items, setItems] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { devotionals } = await api.listDevotionals();
    setItems(devotionals);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [load]);

  const remove = (dev: Devotional) => {
    Alert.alert('Eliminar entrada', '¿Quitar esta entrada del diario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deleteDevotional(dev.id);
          await load();
        },
      },
    ]);
  };

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            await load().finally(() => setRefreshing(false));
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>Diario espiritual</Text>
            <Button label="Nueva" onPress={() => router.push('/devotional/new')} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Reflexiones, emociones y aplicaciones personales.
          </Text>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>🙏</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Tu diario está vacío</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
              Escribe tu primera reflexión espiritual.
            </Text>
            <Button label="Nueva entrada" onPress={() => router.push('/devotional/new')} />
          </View>
        )
      }
      renderItem={({ item }) => {
        const content = parseDevotionalContent(item);
        const emotion = DEVOTIONAL_EMOTIONS.find((e) => e.name === item.emotion);
        return (
          <Card style={styles.card}>
            <Pressable onPress={() => router.push(`/devotional/read/${item.id}`)}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Pressable onPress={() => remove(item)} hitSlop={8}>
                  <Text style={{ color: colors.textMuted }}>🗑</Text>
                </Pressable>
              </View>
              <View style={styles.metaRow}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
                {emotion ? (
                  <Text style={{ fontSize: 12 }}>
                    {emotion.emoji} {emotion.name}
                  </Text>
                ) : null}
              </View>
              {item.verseRef ? (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                  {item.verseRef}
                </Text>
              ) : null}
              {content.reflection ? (
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }} numberOfLines={2}>
                  {content.reflection}
                </Text>
              ) : null}
            </Pressable>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1, gap: 12 },
  header: { gap: 8, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  card: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
});
