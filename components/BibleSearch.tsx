import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
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
import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import type { BibleVersion, Verse } from '@/lib/types';

export function BibleSearch({ onOpenVerse }: { onOpenVerse?: (bookId: number, chapter: number) => void }) {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Verse[]>([]);
  const [isReference, setIsReference] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBibles().then(({ bibles: list }) => setBibles(list)).catch(() => {});
  }, []);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError('Escribe al menos 2 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchVerses(bibleId, q);
      setResults(data.verses);
      setIsReference(!!data.isReference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openInReader = (verse: Verse) => {
    if (onOpenVerse) {
      onOpenVerse(verse.bookId, verse.chapter);
      return;
    }
    router.push({
      pathname: '/(tabs)/bible',
      params: { bookId: String(verse.bookId), chapter: String(verse.chapter) },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {bibles.length > 0 ? (
          <View style={[styles.pickerWrap, { borderColor: colors.border }]}>
            <Picker
              selectedValue={bibleId}
              onValueChange={(v) => setBibleId(Number(v))}
              style={{ color: colors.text }}
            >
              {bibles.map((b) => (
                <Picker.Item key={b.bibleId} label={b.abbr} value={b.bibleId} />
              ))}
            </Picker>
          </View>
        ) : null}
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="Juan 3:16, amor, fe…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
          disabled={loading}
          onPress={search}
        >
          <Text style={styles.btnText}>{loading ? 'Buscando…' : 'Buscar'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {isReference && results.length > 0 ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>Referencia bíblica</Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : query.trim().length >= 2 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>Sin resultados</Text>
          ) : (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Busca por texto o referencia (ej. Génesis 1:1)
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openInReader(item)}
          >
            <Text style={[styles.ref, { color: colors.primary }]}>
              {item.bookName} {item.chapter}:{item.verse}
            </Text>
            <Text style={{ color: colors.text, lineHeight: 22 }}>{item.text}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { margin: 12, padding: 12, borderWidth: 1, borderRadius: 14, gap: 10 },
  pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700' },
  error: { textAlign: 'center', paddingHorizontal: 16, marginBottom: 8 },
  hint: { paddingHorizontal: 16, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  list: { padding: 12, paddingTop: 0, flexGrow: 1 },
  result: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, gap: 6 },
  ref: { fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 32, paddingHorizontal: 24, lineHeight: 22 },
});
