import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SymbolView } from 'expo-symbols';

import { OfflineBanner } from '@/components/OfflineBanner';
import { BookCover } from '@/components/BookCover';
import { NotebookConfigModal } from '@/components/NotebookConfigModal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as repo from '@/lib/repo';
import { noteTagStyle, parseNoteTags, stripNotePreview } from '@/lib/notebookCovers';
import type { Notebook, NotebookNote } from '@/lib/types';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function NotebookDetailScreen() {
  const { colors, radius, isDark } = useAppTheme();
  const contentPadding = useContentPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const notebookId = Number(id);

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!notebookId || Number.isNaN(notebookId)) return;
    setError(null);
    const [{ notebooks }, { notes: list }] = await Promise.all([
      repo.repoListNotebooks(),
      repo.repoListNotebookNotes(notebookId),
    ]);
    setNotebook(notebooks.find((n) => n.id === notebookId) ?? null);
    setNotes(list);
  }, [notebookId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [notes, search]);

  const saveNotebook = async (name: string, coverImage: string) => {
    if (!notebook) return;
    setSaving(true);
    try {
      await repo.repoUpdateNotebook(notebook.id, name, coverImage);
      setConfigOpen(false);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const deleteNotebook = () => {
    if (!notebook) return;
    Alert.alert('Eliminar libreta', `¿Eliminar "${notebook.name}" y todas sus notas?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await repo.repoDeleteNotebook(notebook.id);
          router.back();
        },
      },
    ]);
  };

  const deleteNote = (note: NotebookNote) => {
    Alert.alert('Eliminar nota', `¿Eliminar "${note.title || 'Sin título'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await repo.repoDeleteNotebookNote(note.id);
          await load();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: notebook?.name ?? 'Cuaderno',
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/note/new?notebookId=${notebookId}`)}
              style={{ paddingHorizontal: 12 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Nota</Text>
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ flex: 1 }}>
          <OfflineBanner />
          <FlatList
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          data={filtered}
          keyExtractor={(item) => String(item.id)}
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
          ListHeaderComponent={
            notebook ? (
              <View style={styles.header}>
                <View style={styles.notebookRow}>
                  <BookCover title={notebook.name} coverImage={notebook.coverImage} width={48} height={64} />
                  <View style={styles.notebookMeta}>
                    <Text style={[styles.notebookTitle, { color: colors.text }]} numberOfLines={2}>
                      {notebook.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {notes.length} {notes.length === 1 ? 'nota' : 'notas'} escritas
                    </Text>
                  </View>
                  <Pressable onPress={() => setConfigOpen(true)} hitSlop={8} style={[styles.iconBtn, { borderColor: colors.border }]}>
                    <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor={colors.textMuted} size={16} />
                  </Pressable>
                  <Pressable onPress={deleteNotebook} hitSlop={8} style={[styles.iconBtn, { borderColor: colors.border }]}>
                    <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={colors.danger} size={16} />
                  </Pressable>
                </View>

                <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
                  <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={colors.textMuted} size={16} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Buscar apuntes o contenido…"
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} tintColor={colors.primary} size={28} />
              <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
                {error ?? (search ? 'No hay notas que coincidan.' : 'Este cuaderno está vacío. Toca + Nota para empezar.')}
              </Text>
              {!search ? (
                <Pressable onPress={() => router.push(`/note/new?notebookId=${notebookId}`)}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Crear una nueva nota</Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const tags = parseNoteTags(item.tags);
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/note/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title || 'Sin título'}
                  </Text>
                  <Pressable onPress={() => deleteNote(item)} hitSlop={8}>
                    <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={colors.textMuted} size={16} />
                  </Pressable>
                </View>

                {tags.length > 0 ? (
                  <View style={styles.tagsRow}>
                    {tags.map((tagId) => {
                      const style = noteTagStyle(tagId, isDark);
                      if (!style) return null;
                      return (
                        <View key={tagId} style={[styles.tag, { backgroundColor: style.backgroundColor }]}>
                          <Text style={{ color: style.color, fontSize: 10, fontWeight: '700' }}>{style.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {item.content ? (
                  <Text style={{ color: colors.textMuted, lineHeight: 20, fontSize: 13 }} numberOfLines={2}>
                    {stripNotePreview(item.content)}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>Nota vacía</Text>
                )}

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} tintColor={colors.textMuted} size={12} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                    Actualizado: {formatDate(item.updatedAt)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
        </View>
      )}

      {notebook ? (
        <NotebookConfigModal
          visible={configOpen}
          mode="edit"
          initialName={notebook.name}
          initialCover={notebook.coverImage}
          saving={saving}
          onClose={() => setConfigOpen(false)}
          onSave={saveNotebook}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1, gap: 0 },
  header: { gap: 14, marginBottom: 16 },
  notebookRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notebookMeta: { flex: 1, gap: 4 },
  notebookTitle: { fontSize: 18, fontWeight: '800' },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
    padding: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
});
