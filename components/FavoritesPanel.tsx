import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GuestPrompt } from '@/components/GuestPrompt';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import type { Favorite } from '@/lib/types';

function openInReader(f: Favorite) {
  router.navigate({
    pathname: '/(tabs)/bible',
    params: {
      bookId: String(f.book_id),
      chapter: String(f.chapter),
      bibleId: String(f.bible_id),
      mode: 'reader',
    },
  });
}

interface FavoritesPanelProps {
  compact?: boolean;
  onViewAll?: () => void;
}

export function FavoritesPanel({ compact, onViewAll }: FavoritesPanelProps) {
  const { colors } = useAppTheme();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { favorites: list } = await api.listFavorites();
      setFavorites(list);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [authLoading, isGuest, load]);

  const remove = (f: Favorite) => {
    Alert.alert('Eliminar favorito', '¿Quitar este versículo de favoritos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deleteFavorite(f.id);
          await load();
        },
      },
    ]);
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <GuestPrompt
        title="Favoritos"
        message="Inicia sesión para guardar y ver tus versículos favoritos."
      />
    );
  }

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />;
  }

  const shown = compact ? favorites.slice(0, 3) : favorites;

  if (favorites.length === 0) {
    return (
      <Card style={styles.empty} dashed>
        <Text style={{ fontSize: 32, textAlign: 'center' }}>⭐</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes favoritos</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
          Mientras lees la Biblia, selecciona un versículo y pulsa ★ para guardarlo aquí.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {shown.map((f) => (
        <Card key={f.id} onPress={() => openInReader(f)} style={styles.item}>
          <View style={styles.itemHeader}>
            <View style={[styles.refBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                {f.book_name} {f.chapter}:{f.verse}
              </Text>
            </View>
            {!compact ? (
              <Pressable onPress={() => remove(f)} hitSlop={8}>
                <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>Eliminar</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.verseText, { color: colors.text }]} numberOfLines={compact ? 2 : undefined}>
            "{f.verse_text}"
          </Text>
          {!compact ? (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
              {new Date(f.created_at).toLocaleDateString('es')}
            </Text>
          ) : null}
        </Card>
      ))}
      {compact && favorites.length > 3 && onViewAll ? (
        <Pressable onPress={onViewAll} style={styles.viewAll}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Ver todos ({favorites.length}) →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 12 },
  item: { gap: 8 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  refBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  verseText: { fontSize: 17, lineHeight: 26, fontStyle: 'italic' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  viewAll: { alignItems: 'center', paddingVertical: 8 },
});
