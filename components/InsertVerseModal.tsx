import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import { formatVerseInsertion } from '@/lib/verseInsert';
import type { BibleVersion, Book, Verse } from '@/lib/types';

interface InsertVerseModalProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}

export function InsertVerseModal({ visible, onClose, onInsert }: InsertVerseModalProps) {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [selected, setSelected] = useState<Pick<Verse, 'verse' | 'text'>[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    if (!visible) return;
    api.listBibles().then(({ bibles: list }) => setBibles(list)).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!visible || !bibleId) return;
    api.listBooks(bibleId).then(({ books: list }) => {
      setBooks(list);
      setBookId(list[0]?.bookId ?? null);
      setChapter(1);
      setSelected([]);
    }).catch(() => {});
  }, [visible, bibleId]);

  useEffect(() => {
    if (!visible || !bookId) return;
    setLoadingVerses(true);
    setSelected([]);
    api
      .getVerses(bibleId, bookId, chapter)
      .then(({ verses: list }) => setVerses(list))
      .catch(() => setVerses([]))
      .finally(() => setLoadingVerses(false));
  }, [visible, bibleId, bookId, chapter]);

  const selectedBook = books.find((b) => b.bookId === bookId);
  const selectedBible = bibles.find((b) => b.bibleId === bibleId);
  const maxChapter = selectedBook?.chapters ?? 1;

  const toggleVerse = (v: Verse) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.verse === v.verse);
      if (exists) return prev.filter((s) => s.verse !== v.verse);
      return [...prev, { verse: v.verse, text: v.text }].sort((a, b) => a.verse - b.verse);
    });
  };

  const toggleAll = () => {
    if (selected.length === verses.length) {
      setSelected([]);
    } else {
      setSelected(verses.map((v) => ({ verse: v.verse, text: v.text })));
    }
  };

  const insert = () => {
    if (selected.length === 0 || !selectedBook || !selectedBible) return;
    const text = formatVerseInsertion(
      selected,
      selectedBook.bookName,
      chapter,
      selectedBible.abbr,
    );
    onInsert(text);
    setSelected([]);
    onClose();
  };

  const close = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Insertar versículos</Text>
          <Pressable onPress={close}>
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cerrar</Text>
          </Pressable>
        </View>

        <View style={[styles.pickers, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker selectedValue={bibleId} onValueChange={(v) => setBibleId(Number(v))} style={{ color: colors.text }}>
              {bibles.map((b) => (
                <Picker.Item key={b.bibleId} label={`${b.name} (${b.abbr})`} value={b.bibleId} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker
              selectedValue={bookId ?? undefined}
              onValueChange={(v) => { setBookId(Number(v)); setChapter(1); }}
              style={{ color: colors.text }}
            >
              {books.map((b) => (
                <Picker.Item key={b.bookId} label={b.bookName} value={b.bookId} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker
              selectedValue={chapter}
              onValueChange={(v) => setChapter(Number(v))}
              style={{ color: colors.text }}
            >
              {Array.from({ length: maxChapter }, (_, i) => i + 1).map((ch) => (
                <Picker.Item key={ch} label={`Capítulo ${ch}`} value={ch} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 12 }}>SELECCIONA VERSÍCULOS</Text>
          {verses.length > 0 ? (
            <Pressable onPress={toggleAll}>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                {selected.length === verses.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {loadingVerses ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={verses}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
            renderItem={({ item }) => {
              const checked = selected.some((s) => s.verse === item.verse);
              return (
                <Pressable
                  style={[
                    styles.verseRow,
                    {
                      borderColor: checked ? colors.primary : colors.border,
                      backgroundColor: checked ? colors.primarySoft : colors.card,
                    },
                  ]}
                  onPress={() => toggleVerse(item)}
                >
                  <Text style={{ color: colors.primary, fontWeight: '800', marginRight: 8 }}>{item.verse}</Text>
                  <Text style={{ color: colors.text, flex: 1, lineHeight: 22 }}>{item.text}</Text>
                </Pressable>
              );
            }}
          />
        )}

        <View style={[styles.footer, { borderColor: colors.border, backgroundColor: colors.card, paddingBottom: contentPadding }]}>
          <Pressable style={styles.cancelBtn} onPress={close}>
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.insertBtn, { backgroundColor: colors.primary, opacity: selected.length === 0 ? 0.5 : 1 }]}
            disabled={selected.length === 0}
            onPress={insert}
          >
            <Text style={styles.insertText}>
              Insertar{selected.length > 0 ? ` (${selected.length})` : ''}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  pickers: { padding: 12, gap: 8, borderBottomWidth: 1 },
  pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: { padding: 12, paddingTop: 0, gap: 8 },
  verseRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  insertBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  insertText: { color: '#FFF', fontWeight: '700' },
});
