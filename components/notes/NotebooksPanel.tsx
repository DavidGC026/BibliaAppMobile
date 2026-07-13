import { router } from 'expo-router';
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

import { NotebookConfigModal } from '@/components/NotebookConfigModal';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as repo from '@/lib/repo';
import { countNoteWords } from '@/lib/notebookCovers';
import type { Notebook, NotebookNote } from '@/lib/types';

type NotebookSummary = {
  noteCount: number;
  wordCount: number;
  updatedAt: string | null;
};

function formatNotebookDate(iso: string | null) {
  if (!iso) return 'Sin notas todavía';
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

export function NotebooksPanel() {
  const { colors, typography, radius, shadow } = useAppTheme();
  const contentPadding = useContentPadding();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [summaries, setSummaries] = useState<Record<number, NotebookSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const { notebooks: list } = await repo.repoListNotebooks();
      setNotebooks(list);
      const details = await Promise.all(
        list.map(async (notebook) => {
          try {
            const { notes } = await repo.repoListNotebookNotes(notebook.id);
            return [notebook.id, summarizeNotes(notes)] as const;
          } catch {
            return [notebook.id, { noteCount: 0, wordCount: 0, updatedAt: null }] as const;
          }
        }),
      );
      setSummaries(Object.fromEntries(details));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cuadernos');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const openCreate = () => {
    setModalMode('create');
    setEditingNotebook(null);
    setModalOpen(true);
  };

  const openEdit = (notebook: Notebook) => {
    setModalMode('edit');
    setEditingNotebook(notebook);
    setModalOpen(true);
  };

  const confirmDelete = (notebook: Notebook) => {
    Alert.alert('Eliminar libreta', `¿Eliminar "${notebook.name}" y todas sus notas?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await repo.repoDeleteNotebook(notebook.id);
          await load();
        },
      },
    ]);
  };

  const saveNotebook = async (name: string, coverImage: string) => {
    setSaving(true);
    try {
      if (modalMode === 'create') {
        await repo.repoCreateNotebook(name, coverImage);
      } else if (editingNotebook) {
        await repo.repoUpdateNotebook(editingNotebook.id, name, coverImage);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotebooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...notebooks].sort((a, b) => {
      const aTime = summaries[a.id]?.updatedAt ?? a.createdAt;
      const bTime = summaries[b.id]?.updatedAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    if (!q) return sorted;
    return sorted.filter((notebook) => notebook.name.toLowerCase().includes(q));
  }, [notebooks, search, summaries]);

  const totalNotes = useMemo(
    () => Object.values(summaries).reduce((sum, item) => sum + item.noteCount, 0),
    [summaries],
  );

  const totalWords = useMemo(
    () => Object.values(summaries).reduce((sum, item) => sum + item.wordCount, 0),
    [summaries],
  );

  return (
    <>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
        data={filteredNotebooks}
        keyExtractor={(item) => String(item.id)}
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
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.commandPanel, shadow.sm, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h2, { color: colors.text }]}>Biblioteca de trabajo</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
                  Libretas activas, apuntes recientes y material de estudio en un solo lugar.
                </Text>
              </View>
              <Button label="Nueva libreta" onPress={openCreate} style={styles.createBtn} />
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statPill, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{notebooks.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Libretas</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalNotes}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Notas</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalWords}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Palabras</Text>
              </View>
            </View>
            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={colors.textMuted} size={16} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar libreta..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <SymbolView name={{ ios: 'book.closed.fill', android: 'book', web: 'book' }} tintColor={colors.primary} size={32} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin libretas</Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
                {search ? 'No hay libretas con ese nombre.' : 'Crea una libreta para organizar cualquier tipo de apunte.'}
              </Text>
              {!search ? <Button label="Crear libreta" onPress={openCreate} /> : null}
              {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
            </View>
          )
        }
        renderItem={({ item }) => {
          const summary = summaries[item.id] ?? { noteCount: 0, wordCount: 0, updatedAt: null };
          return (
            <Pressable
              style={[styles.notebookCard, shadow.sm, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl }]}
              onPress={() => router.push(`/notebook/${item.id}`)}
            >
              <View style={[styles.notebookMark, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
                <SymbolView name={{ ios: 'book.closed', android: 'book', web: 'book' }} tintColor={colors.primary} size={19} />
              </View>

              <View style={styles.notebookInfo}>
                <Text style={[styles.notebookTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }} numberOfLines={1}>
                  {summary.noteCount} {summary.noteCount === 1 ? 'nota' : 'notas'} · {summary.wordCount} palabras · {formatNotebookDate(summary.updatedAt)}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    openEdit(item);
                  }}
                  hitSlop={6}
                  style={[styles.actionBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}
                >
                  <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor={colors.textMuted} size={14} />
                </Pressable>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    confirmDelete(item);
                  }}
                  hitSlop={6}
                  style={[styles.actionBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}
                >
                  <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={colors.danger} size={14} />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <NotebookConfigModal
        visible={modalOpen}
        mode={modalMode}
        initialName={editingNotebook?.name ?? ''}
        initialCover={editingNotebook?.coverImage ?? 'grad-purple'}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={saveNotebook}
      />
    </>
  );
}

function summarizeNotes(notes: NotebookNote[]): NotebookSummary {
  return notes.reduce<NotebookSummary>(
    (acc, note) => {
      acc.noteCount += 1;
      acc.wordCount += countNoteWords(note.content);
      if (!acc.updatedAt || new Date(note.updatedAt).getTime() > new Date(acc.updatedAt).getTime()) {
        acc.updatedAt = note.updatedAt;
      }
      return acc;
    },
    { noteCount: 0, wordCount: 0, updatedAt: null },
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  header: { gap: 12, marginBottom: 16 },
  commandPanel: {
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  notebookCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notebookMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notebookInfo: { flex: 1, gap: 3, minWidth: 0 },
  notebookTitle: { fontSize: 15, fontWeight: '800' },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
});
