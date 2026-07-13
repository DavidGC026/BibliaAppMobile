import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { exportNoteAsPdf } from '@/lib/noteExport';
import { shareNote } from '@/lib/share';
import {
  countNoteWords,
  estimateNoteReadMinutes,
  isNotePinned,
  noteHtmlToPlainText,
  noteTagStyle,
  parseNoteTags,
  stripNotePreview,
  togglePinnedNoteTag,
} from '@/lib/notebookCovers';
import type { Notebook, NotebookNote } from '@/lib/types';

type NoteSort = 'recent' | 'title' | 'long';

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

function formatCompactDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

export default function NotebookDetailScreen() {
  const { colors, radius, isDark, shadow } = useAppTheme();
  const contentPadding = useContentPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const notebookId = Number(id);

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<NoteSort>('recent');
  const [configOpen, setConfigOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<NotebookNote | null>(null);
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
    const sorted = [...notes].sort((a, b) => {
      const pinnedDelta = Number(isNotePinned(b.tags)) - Number(isNotePinned(a.tags));
      if (pinnedDelta !== 0) return pinnedDelta;
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'es');
      if (sortBy === 'long') return countNoteWords(b.content) - countNoteWords(a.content);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    if (!q) return sorted;
    return sorted.filter((n) => {
      const plain = noteHtmlToPlainText(n.content);
      return n.title.toLowerCase().includes(q) || plain.toLowerCase().includes(q);
    });
  }, [notes, search, sortBy]);

  const totalWords = useMemo(() => notes.reduce((sum, note) => sum + countNoteWords(note.content), 0), [notes]);
  const lastUpdated = useMemo(() => {
    if (!notes.length) return null;
    return notes.reduce((latest, note) => (
      new Date(note.updatedAt).getTime() > new Date(latest).getTime() ? note.updatedAt : latest
    ), notes[0].updatedAt);
  }, [notes]);

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

  const togglePin = async (note: NotebookNote) => {
    try {
      await repo.repoUpdateNotebookNote(note.id, note.title, note.content, togglePinnedNoteTag(note.tags));
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar la nota');
    }
  };

  const shareNoteAction = (note: NotebookNote) => {
    Alert.alert('Compartir nota', undefined, [
      {
        text: 'Compartir como texto',
        onPress: () => void shareNote({ title: note.title, body: noteHtmlToPlainText(note.content) }),
      },
      {
        text: 'Exportar como PDF',
        onPress: async () => {
          try {
            await exportNoteAsPdf({ title: note.title, contentHtml: note.content });
          } catch {
            Alert.alert('Error', 'No se pudo generar el PDF.');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const moveNote = async (note: NotebookNote, targetNotebookId: number) => {
    try {
      await repo.repoMoveNotebookNote(note.id, targetNotebookId);
      setMoveTarget(null);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo mover la nota');
    }
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
                <View style={[styles.notebookPanel, shadow.sm, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl }]}>
                  <BookCover title={notebook.name} coverImage={notebook.coverImage} width={44} height={58} />
                  <View style={styles.notebookMeta}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Libreta activa</Text>
                    <Text style={[styles.notebookTitle, { color: colors.text }]} numberOfLines={2}>
                      {notebook.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
                      {notes.length} {notes.length === 1 ? 'nota' : 'notas'} · {totalWords} palabras · {lastUpdated ? `última ${formatCompactDate(lastUpdated)}` : 'sin actividad'}
                    </Text>
                  </View>
                  <Pressable onPress={() => setConfigOpen(true)} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                    <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor={colors.textMuted} size={16} />
                  </Pressable>
                  <Pressable onPress={deleteNotebook} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
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

                <View style={styles.summaryRow}>
                  <View style={[styles.summaryBox, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{notes.length}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Notas</Text>
                  </View>
                  <View style={[styles.summaryBox, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{totalWords}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Palabras</Text>
                  </View>
                  <View style={[styles.summaryBox, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{lastUpdated ? formatCompactDate(lastUpdated) : '-'}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Última</Text>
                  </View>
                </View>

                <View style={styles.sortRow}>
                  {[
                    ['recent', 'Recientes'],
                    ['title', 'A-Z'],
                    ['long', 'Largas'],
                  ].map(([key, label]) => {
                    const selected = sortBy === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setSortBy(key as NoteSort)}
                        style={[
                          styles.sortChip,
                          {
                            backgroundColor: selected ? colors.primarySoft : colors.cardMuted,
                            borderColor: selected ? colors.primaryBorder : colors.border,
                          },
                        ]}
                      >
                        <Text style={{ color: selected ? colors.primary : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
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
            const pinned = isNotePinned(item.tags);
            return (
              <Pressable
                style={[styles.card, shadow.sm, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/note/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleBlock}>
                    <View style={styles.titleRow}>
                      {pinned ? (
                        <SymbolView name={{ ios: 'pin.fill', android: 'push_pin', web: 'push_pin' }} tintColor={colors.primary} size={14} />
                      ) : null}
                      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {item.title || 'Sin título'}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                      {formatDate(item.updatedAt)} · {estimateNoteReadMinutes(item.content)} min
                    </Text>
                  </View>
                  <View style={styles.noteActions}>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      togglePin(item);
                    }}
                    hitSlop={8}
                    style={[styles.noteActionBtn, { backgroundColor: pinned ? colors.primarySoft : colors.cardMuted, borderColor: pinned ? colors.primaryBorder : colors.border }]}
                  >
                    <SymbolView
                      name={pinned ? { ios: 'pin.slash', android: 'keep_off', web: 'keep_off' } : { ios: 'pin', android: 'push_pin', web: 'push_pin' }}
                      tintColor={pinned ? colors.primary : colors.textMuted}
                      size={16}
                    />
                  </Pressable>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      setMoveTarget(item);
                    }}
                    hitSlop={8}
                    style={[styles.noteActionBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}
                  >
                    <SymbolView name={{ ios: 'folder', android: 'drive_file_move', web: 'drive_file_move' }} tintColor={colors.textMuted} size={16} />
                  </Pressable>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      shareNoteAction(item);
                    }}
                    hitSlop={8}
                    style={[styles.noteActionBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}
                  >
                    <SymbolView name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }} tintColor={colors.textMuted} size={16} />
                  </Pressable>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      deleteNote(item);
                    }}
                    hitSlop={8}
                    style={[styles.noteActionBtn, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}
                  >
                    <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} tintColor={colors.textMuted} size={16} />
                  </Pressable>
                  </View>
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
                  <View style={styles.footerMetric}>
                    <SymbolView name={{ ios: 'text.alignleft', android: 'notes', web: 'notes' }} tintColor={colors.textMuted} size={12} />
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                      {countNoteWords(item.content)} palabras
                    </Text>
                  </View>
                  <View style={styles.footerMetric}>
                    <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} tintColor={colors.primary} size={13} />
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>Abrir</Text>
                  </View>
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

      <MoveNoteModal
        visible={!!moveTarget}
        note={moveTarget}
        currentNotebookId={notebookId}
        onClose={() => setMoveTarget(null)}
        onMove={moveNote}
      />
    </>
  );
}

function MoveNoteModal({
  visible,
  note,
  currentNotebookId,
  onClose,
  onMove,
}: {
  visible: boolean;
  note: NotebookNote | null;
  currentNotebookId: number;
  onClose: () => void;
  onMove: (note: NotebookNote, targetNotebookId: number) => void;
}) {
  const { colors } = useAppTheme();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);

  useEffect(() => {
    if (!visible) return;
    repo.repoListNotebooks().then(({ notebooks: list }) => setNotebooks(list)).catch(() => setNotebooks([]));
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.moveModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.moveTitle, { color: colors.text }]}>Mover nota</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={2}>
            {note?.title || 'Sin título'}
          </Text>
          <FlatList
            data={notebooks.filter((item) => item.id !== currentNotebookId)}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 280 }}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 18 }}>
                No hay otra libreta disponible.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.moveOption, { borderColor: colors.border }]}
                onPress={() => {
                  if (note) onMove(note, item.id);
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
              </Pressable>
            )}
          />
          <Pressable onPress={onClose} style={styles.moveCancel}>
            <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1, gap: 0 },
  header: { gap: 14, marginBottom: 16 },
  notebookPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12 },
  notebookMeta: { flex: 1, gap: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
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
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryBox: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, gap: 2 },
  summaryValue: { fontSize: 15, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  titleBlock: { flex: 1, gap: 3, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 16, fontWeight: '800', flex: 1 },
  noteActions: { flexDirection: 'row', gap: 5 },
  noteActionBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 2,
  },
  footerMetric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  empty: {
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
    padding: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  moveModal: { width: '100%', borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  moveTitle: { fontSize: 18, fontWeight: '800' },
  moveOption: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  moveCancel: { paddingVertical: 10 },
});
