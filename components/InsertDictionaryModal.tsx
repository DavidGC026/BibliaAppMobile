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

import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import { repoSearchDictionary } from '@/lib/repo';
import { parseDictionaryDefinition } from '@/lib/dictionaryInsert';
import type { StrongEntry } from '@/lib/types';

type Lang = 'all' | 'greek' | 'hebrew';

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'greek', label: 'Griego' },
  { id: 'hebrew', label: 'Hebreo' },
];

const EXAMPLES = ['G25', 'H430', 'agapao', 'shalom', 'logos'];

interface InsertDictionaryModalProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (entry: StrongEntry) => void;
}

export function InsertDictionaryModal({ visible, onClose, onInsert }: InsertDictionaryModalProps) {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [lang, setLang] = useState<Lang>('all');
  const [page, setPage] = useState(1);
  const [browse, setBrowse] = useState(false);
  const [selected, setSelected] = useState<StrongEntry | null>(null);
  const [entries, setEntries] = useState<StrongEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setDebounced('');
    setSelected(null);
    setPage(1);
    setBrowse(false);
  }, [visible]);

  useEffect(() => {
    setPage(1);
    setSelected(null);
  }, [debounced, lang, browse]);

  const hasValidQuery = debounced.length >= 2 || /^[gh]\d+$/i.test(debounced);
  const shouldFetch = hasValidQuery || browse;

  useEffect(() => {
    if (!visible || !shouldFetch) {
      setEntries([]);
      return;
    }
    setLoading(true);
    repoSearchDictionary({ q: debounced, lang, page, browse: browse && !hasValidQuery })
      .then((data) => {
        setEntries(data.entries);
        setTotalPages(data.totalPages);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [visible, debounced, lang, page, browse, shouldFetch, hasValidQuery]);

  const insert = () => {
    if (!selected) return;
    onInsert(selected);
    setSelected(null);
    onClose();
  };

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Insertar del diccionario</Text>
          <Pressable onPress={close}>
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cerrar</Text>
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="G25, agapao, shalom, H430…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (t) setBrowse(false);
            }}
          />
          <View style={styles.langRow}>
            {LANG_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.langBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: lang === opt.id ? '#EDE9FE' : colors.background,
                  },
                ]}
                onPress={() => setLang(opt.id)}
              >
                <Text
                  style={{
                    color: lang === opt.id ? '#6D28D9' : colors.textMuted,
                    fontWeight: '600',
                    fontSize: 12,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!shouldFetch ? (
          <View style={styles.hint}>
            <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'center' }}>
              Busca una palabra Strong para insertarla en tu nota
            </Text>
            <View style={styles.examples}>
              {EXAMPLES.map((ex) => (
                <Pressable
                  key={ex}
                  style={[styles.exampleBtn, { borderColor: '#C4B5FD' }]}
                  onPress={() => setQuery(ex)}
                >
                  <Text style={{ color: '#6D28D9', fontWeight: '600' }}>{ex}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.browseBtn, { borderColor: '#7C3AED' }]}
              onPress={() => setBrowse(true)}
            >
              <Text style={{ color: '#6D28D9', fontWeight: '700' }}>Explorar diccionario</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.strongCode}
            contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textMuted }]}>Sin resultados.</Text>
            }
            ListFooterComponent={
              totalPages > 1 ? (
                <View style={styles.pagination}>
                  <Pressable
                    style={[styles.pageBtn, { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 }]}
                    disabled={page <= 1}
                    onPress={() => setPage((p) => p - 1)}
                  >
                    <Text style={{ color: '#6D28D9', fontWeight: '600' }}>← Anterior</Text>
                  </Pressable>
                  <Text style={{ color: colors.textMuted }}>{page} / {totalPages}</Text>
                  <Pressable
                    style={[styles.pageBtn, { borderColor: colors.border, opacity: page >= totalPages ? 0.4 : 1 }]}
                    disabled={page >= totalPages}
                    onPress={() => setPage((p) => p + 1)}
                  >
                    <Text style={{ color: '#6D28D9', fontWeight: '600' }}>Siguiente →</Text>
                  </Pressable>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const picked = selected?.strongCode === item.strongCode;
              const preview = parseDictionaryDefinition(item.definition)[0]?.text ?? item.definition;
              return (
                <Pressable
                  style={[
                    styles.entry,
                    {
                      borderColor: picked ? '#7C3AED' : colors.border,
                      backgroundColor: picked ? '#F5F3FF' : colors.card,
                    },
                  ]}
                  onPress={() => setSelected(item)}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{item.strongCode}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{item.lemma}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item.transliteration}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }} numberOfLines={2}>
                    {preview}
                  </Text>
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
            style={[styles.insertBtn, { backgroundColor: '#7C3AED', opacity: selected ? 1 : 0.5 }]}
            disabled={!selected}
            onPress={insert}
          >
            <Text style={styles.insertText}>
              {selected ? `Insertar ${selected.strongCode}` : 'Insertar palabra'}
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
  searchBox: { margin: 12, marginBottom: 0, padding: 12, borderWidth: 1, borderRadius: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  hint: { padding: 24, gap: 16, alignItems: 'center', flex: 1 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  exampleBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  browseBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  list: { padding: 12, flexGrow: 1 },
  entry: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, gap: 8 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codeText: { color: '#6D28D9', fontWeight: '800', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 32 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  pageBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
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
