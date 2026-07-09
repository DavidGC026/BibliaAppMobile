import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import type { Book } from '@/lib/types';

interface BibleSelectorModalProps {
  visible: boolean;
  books: Book[];
  currentBookId: number | null;
  onSelect: (bookId: number, chapter: number) => void;
  onClose: () => void;
}

export function BibleSelectorModal({
  visible,
  books,
  currentBookId,
  onSelect,
  onClose,
}: BibleSelectorModalProps) {
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(currentBookId);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setExpandedId(currentBookId);
    }
  }, [visible, currentBookId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.bookName.toLowerCase().includes(q));
  }, [books, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Text style={[styles.headerIcon, { color: colors.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Libros</Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.search, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>⌕</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(b) => String(b.bookId)}
          contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.bookId;
            const isCurrent = currentBookId === item.bookId;
            return (
              <View>
                <Pressable
                  style={[
                    styles.bookRow,
                    isExpanded && { backgroundColor: colors.muted, borderRadius: radius.md },
                  ]}
                  onPress={() => setExpandedId(isExpanded ? null : item.bookId)}
                >
                  <Text
                    style={[
                      styles.bookName,
                      { color: isCurrent ? colors.primary : colors.text },
                    ]}
                  >
                    {item.bookName.toUpperCase()}
                  </Text>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.chapterGrid}>
                    {Array.from({ length: item.chapters }, (_, i) => i + 1).map((ch) => (
                      <Pressable
                        key={ch}
                        style={[
                          styles.chapterCell,
                          {
                            backgroundColor: colors.muted,
                            borderRadius: radius.md,
                          },
                        ]}
                        onPress={() => {
                          onSelect(item.bookId, ch);
                          onClose();
                        }}
                      >
                        <Text style={[styles.chapterText, { color: colors.text }]}>{ch}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const CELL = 56;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 44, alignItems: 'center' },
  headerIcon: { fontSize: 32, fontWeight: '300', lineHeight: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  bookRow: { paddingVertical: 14, paddingHorizontal: 8 },
  bookName: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  chapterCell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterText: { fontSize: 17, fontWeight: '600' },
});
