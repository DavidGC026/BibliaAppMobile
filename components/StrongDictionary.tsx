import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StrongLinkifiedText } from '@/components/StrongLinkifiedText';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import { parseDictionaryDefinition } from '@/lib/dictionary';
import { repoSearchDictionary } from '@/lib/repo';
import type { StrongEntry } from '@/lib/types';

type Lang = 'all' | 'greek' | 'hebrew';

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'greek', label: 'Griego' },
  { id: 'hebrew', label: 'Hebreo' },
];

const EXAMPLES = ['G25', 'H430', 'agapao', 'shalom', 'logos'];

export function StrongDictionary({ initialCode }: { initialCode?: string }) {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [query, setQuery] = useState(initialCode ?? '');
  const [debounced, setDebounced] = useState(initialCode?.trim() ?? '');
  const [lang, setLang] = useState<Lang>('all');
  const [page, setPage] = useState(1);
  const [browse, setBrowse] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(initialCode?.toUpperCase() ?? null);
  const [entries, setEntries] = useState<StrongEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCode = useCallback((code: string) => {
    setQuery(code);
    setBrowse(false);
    setExpanded(code.toUpperCase());
    setPage(1);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debounced, lang, browse]);

  useEffect(() => {
    if (!initialCode) return;
    openCode(initialCode);
  }, [initialCode, openCode]);

  const hasValidQuery = debounced.length >= 2 || /^[gh]\d+$/i.test(debounced);
  const shouldFetch = hasValidQuery || browse;

  useEffect(() => {
    if (!shouldFetch) {
      setEntries([]);
      return;
    }
    setLoading(true);
    setError(null);
    repoSearchDictionary({ q: debounced, lang, page, browse: browse && !hasValidQuery })
      .then((data) => {
        setEntries(data.entries);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [debounced, lang, page, browse, shouldFetch, hasValidQuery]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="G25, agapao, shalom, H430…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(t) => { setQuery(t); if (t) setBrowse(false); }}
        />
        <View style={styles.langRow}>
          {LANG_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.langBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: lang === opt.id ? colors.primarySoft : colors.background,
                },
              ]}
              onPress={() => setLang(opt.id)}
            >
              <Text style={{ color: lang === opt.id ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 12 }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!shouldFetch ? (
        <View style={[styles.hint, { paddingBottom: contentPadding }]}>
          <Text style={{ color: colors.text, fontWeight: '700', textAlign: 'center' }}>
            Busca por código Strong o palabra
          </Text>
          <View style={styles.examples}>
            {EXAMPLES.map((ex) => (
              <Pressable
                key={ex}
                style={[styles.exampleBtn, { borderColor: colors.border }]}
                onPress={() => openCode(ex)}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{ex}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.browseBtn, { borderColor: colors.primary }]}
            onPress={() => setBrowse(true)}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Explorar diccionario</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.strongCode}
          contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <Text style={[styles.header, { color: colors.textMuted }]}>
              {loading ? 'Buscando…' : `${total} entradas`}
            </Text>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
            ) : (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {error ?? 'Sin resultados.'}
              </Text>
            )
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  style={[styles.pageBtn, { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 }]}
                  disabled={page <= 1}
                  onPress={() => setPage((p) => p - 1)}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>← Anterior</Text>
                </Pressable>
                <Text style={{ color: colors.textMuted }}>{page} / {totalPages}</Text>
                <Pressable
                  style={[styles.pageBtn, { borderColor: colors.border, opacity: page >= totalPages ? 0.4 : 1 }]}
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Siguiente →</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const open = expanded === item.strongCode;
            const sections = parseDictionaryDefinition(item.definition);
            const preview = sections[0]?.text ?? item.definition;
            return (
              <Pressable
                style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setExpanded(open ? null : item.strongCode)}
              >
                <View style={styles.entryHeader}>
                  <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>{item.strongCode}</Text>
                  <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{item.lemma}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item.transliteration}</Text>
                </View>
                {!open && preview ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }} numberOfLines={2}>
                    {preview}
                  </Text>
                ) : null}
                {open ? (
                  <View style={styles.defBody}>
                    {sections.length > 0
                      ? sections.map((s, i) => (
                          <View key={i} style={{ gap: 2 }}>
                            {s.label ? (
                              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{s.label}</Text>
                            ) : null}
                            <StrongLinkifiedText
                              text={s.text}
                              style={{ color: colors.text, lineHeight: 22, fontSize: 14 }}
                              codeStyle={{ color: colors.primary, fontWeight: '700' }}
                              onCodePress={openCode}
                            />
                          </View>
                        ))
                      : (
                        <StrongLinkifiedText
                          text={item.definition}
                          style={{ color: colors.text, lineHeight: 22 }}
                          codeStyle={{ color: colors.primary, fontWeight: '700' }}
                          onCodePress={openCode}
                        />
                      )}
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { margin: 12, marginBottom: 0, padding: 12, borderWidth: 1, borderRadius: 14, gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  hint: { padding: 24, gap: 16, alignItems: 'center' },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  exampleBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  browseBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  list: { padding: 12, flexGrow: 1 },
  header: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  entry: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, gap: 8 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  defBody: { gap: 10, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 32 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  pageBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
