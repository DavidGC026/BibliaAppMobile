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
import { SymbolView } from 'expo-symbols';

import { AuthedImage } from '@/components/AuthedImage';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { ExternalBook } from '@/lib/types';

export function StudyBooksPanel() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const [books, setBooks] = useState<ExternalBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { books: list } = await api.listExternalBooks();
    setBooks(list);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
      data={books}
      numColumns={2}
      keyExtractor={(item) => String(item.id)}
      columnWrapperStyle={styles.row}
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
            <Text style={[typography.h2, { color: colors.text, flex: 1 }]}>Libros de estudio</Text>
            <Button label="Añadir" onPress={() => router.push('/study-book/new')} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Libros físicos o externos con bitácora de lectura.
          </Text>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <View style={styles.empty}>
            <SymbolView name={{ ios: 'books.vertical.fill', android: 'library_books', web: 'library_books' }} tintColor={colors.primary} size={32} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Biblioteca vacía</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
              Registra los libros que estás leyendo y guarda tus reflexiones.
            </Text>
            <Button label="Añadir libro" onPress={() => router.push('/study-book/new')} />
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable style={styles.bookItem} onPress={() => router.push(`/study-book/${item.id}`)}>
          <View style={[styles.cover, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
            {item.coverImage ? (
              <AuthedImage uri={item.coverImage} style={styles.coverImg} />
            ) : (
              <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={colors.textMuted} size={28} />
            )}
          </View>
          <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
            {item.author}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  header: { gap: 8, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { gap: 12, marginBottom: 16, justifyContent: 'space-between' },
  empty: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  bookItem: { width: '48%', gap: 6 },
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: { width: '100%', height: '100%' },
  bookTitle: { fontSize: 14, fontWeight: '800' },
});
