import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import { getLastPassage } from '@/lib/readerState';
import * as repo from '@/lib/repo';
import type { VerseNoteEntry } from '@/lib/types';

/** Abre el lector en el versículo de la nota, ya seleccionado. */
function openInReader(note: VerseNoteEntry, bibleId: number) {
  router.navigate({
    pathname: '/(tabs)/bible',
    params: {
      bookId: String(note.bookId),
      chapter: String(note.chapter),
      verse: String(note.verse),
      bibleId: String(bibleId),
      mode: 'reader',
    },
  });
}

function matches(note: VerseNoteEntry, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${note.bookName} ${note.chapter}:${note.verse} ${note.noteContent ?? ''} ${note.verseText ?? ''}`;
  return haystack.toLowerCase().includes(needle);
}

/**
 * Los versículos que tienen nota, en un solo sitio.
 *
 * La contraparte de la nota de versículo del lector: allí se escribe, aquí se
 * encuentra. Se lee por `repoGetAllVerseNotes`, así que con red trae también lo
 * escrito desde la web y sin red enseña lo guardado en el teléfono.
 */
export function VerseNotesPanel() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const [notes, setNotes] = useState<VerseNoteEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // La versión que el usuario venía leyendo: decide con qué traducción se
  // acompaña cada nota. La nota es del versículo, no de la versión.
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);

  const load = useCallback(async () => {
    const passage = await getLastPassage().catch(() => null);
    const activeBible = passage?.bibleId ?? DEFAULT_BIBLE_ID;
    setBibleId(activeBible);
    // Deja los nombres de los libros en el teléfono antes de leer las notas:
    // sin ellos la lista solo podría enseñar el número del libro.
    await repo.repoListBooks(activeBible).catch(() => {});
    const { links } = await repo.repoGetAllVerseNotes(activeBible);
    setNotes(links);
  }, []);

  // Al volver del lector puede haber una nota nueva, así que se relee al
  // entrar y no solo al montar.
  useFocusEffect(
    useCallback(() => {
      load()
        .catch((err) =>
          Alert.alert('Error', err instanceof Error ? err.message : 'No se pudieron cargar las notas'),
        )
        .finally(() => setLoading(false));
    }, [load]),
  );

  const remove = (note: VerseNoteEntry) => {
    Alert.alert(
      'Eliminar nota',
      `¿Borrar la nota de ${note.bookName} ${note.chapter}:${note.verse}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await repo.repoDeleteVerseNote(note.id);
            await load();
          },
        },
      ],
    );
  };

  const shown = notes.filter((note) => matches(note, query));

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
      data={shown}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
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
          <Text style={[typography.h2, { color: colors.text }]}>Versículos con notas</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Lo que has escrito sobre un versículo concreto. Toca uno para abrirlo en el lector.
          </Text>
          {notes.length > 0 ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por referencia o texto"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.search,
                { color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
              ]}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>📖</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {notes.length === 0 ? 'Todavía no hay notas de versículo' : 'Ninguna nota coincide'}
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
              {notes.length === 0
                ? 'En el lector, toca un versículo y pulsa «Generar nota» para escribir sobre él.'
                : 'Prueba con otra referencia o con otra palabra.'}
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Card style={styles.card} onPress={() => openInReader(item, bibleId)}>
          <View style={styles.cardTop}>
            <View style={[styles.refBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                {item.bookName} {item.chapter}:{item.verse}
              </Text>
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={8}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>Eliminar</Text>
            </Pressable>
          </View>

          {item.verseText ? (
            <Text style={[styles.verseText, { color: colors.textMuted }]} numberOfLines={2}>
              “{item.verseText}”
            </Text>
          ) : null}

          <Text style={[styles.noteText, { color: colors.text }]} numberOfLines={4}>
            {item.noteContent}
          </Text>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  header: { gap: 8, marginBottom: 4 },
  search: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  refBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  verseText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  noteText: { fontSize: 14, lineHeight: 20 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
