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

import { OfflineBanner } from '@/components/OfflineBanner';
import { BookCover } from '@/components/BookCover';
import { NotebookConfigModal } from '@/components/NotebookConfigModal';
import { Button } from '@/components/ui/Button';
import { GuestPrompt } from '@/components/GuestPrompt';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as repo from '@/lib/repo';
import type { Notebook } from '@/lib/types';

export default function NotesScreen() {
  const { colors, typography } = useAppTheme();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { notebooks: list } = await repo.repoListNotebooks();
      setNotebooks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cuadernos');
    }
  }, []);

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [authLoading, isGuest, load]);

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
        title="Notas"
        message="Inicia sesión para acceder a tus cuadernos y libretas de estudio."
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        data={notebooks}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={styles.row}
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
            <View style={styles.headerRow}>
              <View style={styles.headerTitle}>
                <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={colors.primary} size={22} />
                <Text style={[typography.h1, { color: colors.text, fontSize: 22 }]}>Mis libretas</Text>
              </View>
              <Button label="Nueva libreta" onPress={openCreate} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              Tu estantería personal de apuntes y devocionales de estudio.
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
                <SymbolView name={{ ios: 'book.closed.fill', android: 'book', web: 'book' }} tintColor={colors.primary} size={32} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Tu estantería está vacía</Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20, maxWidth: 280 }}>
                Crea tu primera libreta para comenzar a tomar apuntes y devocionales de estudio.
              </Text>
              <Button label="Crear libreta" onPress={openCreate} />
              {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.shelfItem}>
            <View style={styles.coverActions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={6} style={styles.actionBtn}>
                <Text style={styles.actionText}>✎</Text>
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={6} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: '#FCA5A5' }]}>🗑</Text>
              </Pressable>
            </View>
            <BookCover
              title={item.name}
              coverImage={item.coverImage}
              onPress={() => router.push(`/notebook/${item.id}`)}
            />
            <Text style={[styles.shelfLabel, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  header: { gap: 10, marginBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  row: { gap: 12, marginBottom: 20, justifyContent: 'space-between' },
  shelfItem: { width: '48%', alignItems: 'center', gap: 10 },
  coverActions: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  actionBtn: { padding: 4 },
  actionText: { color: '#FFF', fontSize: 13 },
  shelfLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center', width: '100%' },
  empty: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 16 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
});
