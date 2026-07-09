import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import { repoGetCrossReferences, repoGetVerses, repoListBibles, repoListBooks } from '@/lib/repo';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import type { BibleVersion, Book, CrossReference } from '@/lib/types';

interface ReferencesExplorerProps {
  onOpenReference?: (bookId: number, chapter: number) => void;
}

export function ReferencesExplorer({ onOpenReference }: ReferencesExplorerProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState(1);
  const [chapter, setChapter] = useState('1');
  const [verse, setVerse] = useState('1');
  const [refs, setRefs] = useState<CrossReference[]>([]);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repoListBibles().then(({ bibles: list }) => setBibles(list)).catch(() => {});
  }, []);

  useEffect(() => {
    repoListBooks(bibleId).then(({ books: list }) => {
      setBooks(list);
      if (!list.some((b) => b.bookId === bookId)) setBookId(list[0]?.bookId ?? 1);
    }).catch(() => {});
  }, [bibleId]);

  const load = async () => {
    const ch = Number(chapter);
    const vs = Number(verse);
    if (!bookId || !ch || !vs) return;
    setLoading(true);
    setError(null);
    try {
      const [{ references }, { verses }] = await Promise.all([
        repoGetCrossReferences(bibleId, bookId, ch, vs),
        repoGetVerses(bibleId, bookId, ch),
      ]);
      setRefs(references);
      setSourceText(verses.find((v) => v.verse === vs)?.text ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setRefs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [bibleId, bookId, chapter, verse]);

  const bookName = books.find((b) => b.bookId === bookId)?.bookName ?? '';

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => router.push('/rainbow')}
        style={({ pressed }) => [
          styles.rainbowLink,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={{ fontSize: 22 }}>🌈</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Mapa de referencias</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Toda la Biblia en un vistazo</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
      </Pressable>
      <View style={[styles.filters, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
          <Picker selectedValue={bibleId} onValueChange={(v) => setBibleId(Number(v))} style={{ color: colors.text }}>
            {bibles.map((b) => (
              <Picker.Item key={b.bibleId} label={b.abbr} value={b.bibleId} />
            ))}
          </Picker>
        </View>
        <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
          <Picker
            selectedValue={bookId}
            onValueChange={(v) => { setBookId(Number(v)); setChapter('1'); setVerse('1'); }}
            style={{ color: colors.text }}
          >
            {books.map((b) => (
              <Picker.Item key={b.bookId} label={b.bookName} value={b.bookId} />
            ))}
          </Picker>
        </View>
        <View style={styles.numRow}>
          <View style={styles.numCol}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Cap.</Text>
            <TextInput
              style={[styles.numInput, { color: colors.text, borderColor: colors.border }]}
              keyboardType="number-pad"
              value={chapter}
              onChangeText={setChapter}
            />
          </View>
          <View style={styles.numCol}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Vers.</Text>
            <TextInput
              style={[styles.numInput, { color: colors.text, borderColor: colors.border }]}
              keyboardType="number-pad"
              value={verse}
              onChangeText={setVerse}
            />
          </View>
        </View>
      </View>

      {sourceText ? (
        <View style={[styles.sourceBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
          <Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 4 }}>
            {bookName} {chapter}:{verse}
          </Text>
          <Text style={{ color: colors.text, fontStyle: 'italic', lineHeight: 22 }}>{sourceText}</Text>
        </View>
      ) : null}

      <FlatList
        data={refs}
        keyExtractor={(item, i) => `${item.book_id}-${item.chapter}-${item.verse}-${i}`}
        contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <Text style={[styles.header, { color: colors.text }]}>
            Referencias ({refs.length})
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {error ?? 'No hay referencias cruzadas para este versículo.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onOpenReference?.(item.book_id, item.chapter)}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {item.book_name} {item.chapter}:{item.verse}
            </Text>
            <Text style={{ color: colors.text, lineHeight: 22 }}>{item.text}</Text>
            {item.votos > 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.votos} votos</Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rainbowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filters: { margin: 12, marginBottom: 0, padding: 12, borderWidth: 1, borderRadius: 14, gap: 8 },
  pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  numRow: { flexDirection: 'row', gap: 10 },
  numCol: { flex: 1, gap: 4 },
  label: { fontSize: 12, fontWeight: '600' },
  numInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  sourceBox: { margin: 12, marginBottom: 0, padding: 14, borderWidth: 1, borderRadius: 12 },
  list: { padding: 12, flexGrow: 1 },
  header: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  refCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, gap: 6 },
  empty: { textAlign: 'center', marginTop: 32, paddingHorizontal: 24, lineHeight: 22 },
});
