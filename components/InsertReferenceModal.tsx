import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useContentPadding } from '@/hooks/useContentPadding';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import { formatReferenceInsertion } from '@/lib/referenceInsert';
import * as repo from '@/lib/repo';
import type { BibleVersion, Book, CrossReference } from '@/lib/types';

interface InsertReferenceModalProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

export function InsertReferenceModal({ visible, onClose, onInsert }: InsertReferenceModalProps) {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [refs, setRefs] = useState<CrossReference[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState('1');
  const [verse, setVerse] = useState('1');
  const [selected, setSelected] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    repo.repoListBibles().then(({ bibles: list }) => setBibles(list)).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    repo.repoListBooks(bibleId)
      .then(({ books: list }) => {
        setBooks(list);
        setBookId(list[0]?.bookId ?? null);
        setChapter('1');
        setVerse('1');
        setSelected([]);
      })
      .catch(() => {});
  }, [visible, bibleId]);

  const selectedBook = books.find((book) => book.bookId === bookId);
  const selectedBible = bibles.find((bible) => bible.bibleId === bibleId);
  const maxChapter = selectedBook?.chapters ?? 1;

  const load = async () => {
    const ch = Number(chapter);
    const vs = Number(verse);
    if (!bookId || !ch || !vs) return;
    setLoading(true);
    setError(null);
    setSelected([]);
    try {
      const data = await repo.repoGetCrossReferences(bibleId, bookId, ch, vs);
      setRefs(data.references);
    } catch (err) {
      setRefs([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar referencias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !bookId) return;
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [visible, bibleId, bookId, chapter, verse]);

  const toggle = (ref: CrossReference) => {
    setSelected((prev) => {
      const exists = prev.some((item) => sameRef(item, ref));
      if (exists) return prev.filter((item) => !sameRef(item, ref));
      return [...prev, ref];
    });
  };

  const insert = () => {
    if (!selectedBook || !selectedBible || selected.length === 0) return;
    const source = `${selectedBook.bookName} ${Number(chapter)}:${Number(verse)}`;
    onInsert(formatReferenceInsertion(source, selected, selectedBible.abbr));
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
        <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Insertar referencias</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Elige un versículo origen y sus relaciones.</Text>
          </View>
          <Pressable onPress={close}>
            <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cerrar</Text>
          </Pressable>
        </View>

        <View style={[styles.filters, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker selectedValue={bibleId} onValueChange={(v) => setBibleId(Number(v))} style={{ color: colors.text }}>
              {bibles.map((bible) => (
                <Picker.Item key={bible.bibleId} label={bible.abbr} value={bible.bibleId} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker
              selectedValue={bookId ?? undefined}
              onValueChange={(v) => {
                setBookId(Number(v));
                setChapter('1');
                setVerse('1');
              }}
              style={{ color: colors.text }}
            >
              {books.map((book) => (
                <Picker.Item key={book.bookId} label={book.bookName} value={book.bookId} />
              ))}
            </Picker>
          </View>
          <View style={styles.numRow}>
            <View style={styles.numCol}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Capítulo</Text>
              <TextInput
                style={[styles.numInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="number-pad"
                value={chapter}
                onChangeText={(value) => setChapter(limitNumber(value, maxChapter))}
              />
            </View>
            <View style={styles.numCol}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Versículo</Text>
              <TextInput
                style={[styles.numInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="number-pad"
                value={verse}
                onChangeText={setVerse}
              />
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={refs}
            keyExtractor={(item, index) => `${item.book_id}-${item.chapter}-${item.verse}-${index}`}
            contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {error ?? 'No hay referencias para este versículo.'}
              </Text>
            }
            renderItem={({ item }) => {
              const picked = selected.some((ref) => sameRef(ref, item));
              return (
                <Pressable
                  style={[
                    styles.refCard,
                    {
                      backgroundColor: picked ? colors.primarySoft : colors.card,
                      borderColor: picked ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggle(item)}
                >
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>
                    {item.book_name} {item.chapter}:{item.verse}
                  </Text>
                  <Text style={{ color: colors.text, lineHeight: 22 }}>{item.text}</Text>
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
            <Text style={styles.insertText}>Insertar ({selected.length})</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function sameRef(a: CrossReference, b: CrossReference) {
  return a.book_id === b.book_id && a.chapter === b.chapter && a.verse === b.verse;
}

function limitNumber(value: string, max: number) {
  const parsed = Number(value);
  if (!parsed) return value.replace(/\D/g, '');
  return String(Math.min(Math.max(parsed, 1), max));
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  filters: { margin: 12, marginBottom: 0, padding: 12, borderWidth: 1, borderRadius: 14, gap: 8 },
  pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  numRow: { flexDirection: 'row', gap: 10 },
  numCol: { flex: 1, gap: 4 },
  label: { fontSize: 12, fontWeight: '700' },
  numInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  list: { padding: 12, flexGrow: 1 },
  refCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, gap: 6 },
  empty: { textAlign: 'center', marginTop: 32, paddingHorizontal: 24, lineHeight: 22 },
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
