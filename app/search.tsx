import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import * as repo from '@/lib/repo';
import type { RecentNotebookNote } from '@/lib/repo';
import type { Devotional, StrongEntry, Verse } from '@/lib/types';

const MIN_QUERY = 2;
const SECTION_LIMIT = 5;

type SectionState<T> = { items: T[]; loading: boolean };

function emptySection<T>(): SectionState<T> {
  return { items: [], loading: false };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function UniversalSearchScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest } = useAuth();

  const [query, setQuery] = useState('');
  const [verses, setVerses] = useState<SectionState<Verse>>(emptySection());
  const [notes, setNotes] = useState<SectionState<RecentNotebookNote>>(emptySection());
  const [devotionals, setDevotionals] = useState<SectionState<Devotional>>(emptySection());
  const [dictionary, setDictionary] = useState<SectionState<StrongEntry>>(emptySection());
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setVerses(emptySection());
      setNotes(emptySection());
      setDevotionals(emptySection());
      setDictionary(emptySection());
      return;
    }

    const id = ++requestId.current;
    setVerses((s) => ({ ...s, loading: true }));
    setDictionary((s) => ({ ...s, loading: true }));
    if (!isGuest) {
      setNotes((s) => ({ ...s, loading: true }));
      setDevotionals((s) => ({ ...s, loading: true }));
    }

    const timer = setTimeout(() => {
      repo
        .repoSearchVerses(DEFAULT_BIBLE_ID, q)
        .then((res) => {
          if (requestId.current !== id) return;
          setVerses({ items: res.verses.slice(0, SECTION_LIMIT), loading: false });
        })
        .catch(() => {
          if (requestId.current === id) setVerses(emptySection());
        });

      repo
        .repoSearchDictionary({ q, lang: 'all' })
        .then((res) => {
          if (requestId.current !== id) return;
          setDictionary({ items: res.entries.slice(0, SECTION_LIMIT), loading: false });
        })
        .catch(() => {
          if (requestId.current === id) setDictionary(emptySection());
        });

      if (!isGuest) {
        repo
          .repoSearchNotes(q, SECTION_LIMIT)
          .then((res) => {
            if (requestId.current !== id) return;
            setNotes({ items: res.notes, loading: false });
          })
          .catch(() => {
            if (requestId.current === id) setNotes(emptySection());
          });

        api
          .listDevotionals()
          .then(({ devotionals: list }) => {
            if (requestId.current !== id) return;
            const lower = q.toLowerCase();
            const matches = list.filter((d) => {
              const contentText = typeof d.content === 'string' ? d.content : JSON.stringify(d.content ?? '');
              return (
                d.title.toLowerCase().includes(lower) ||
                (d.verseRef ?? '').toLowerCase().includes(lower) ||
                contentText.toLowerCase().includes(lower)
              );
            });
            setDevotionals({ items: matches.slice(0, SECTION_LIMIT), loading: false });
          })
          .catch(() => {
            if (requestId.current === id) setDevotionals(emptySection());
          });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isGuest]);

  const hasQuery = query.trim().length >= MIN_QUERY;
  const totalResults = verses.items.length + notes.items.length + devotionals.items.length + dictionary.items.length;
  const anyLoading = verses.loading || notes.loading || devotionals.loading || dictionary.loading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[typography.h1, { color: colors.text }]}>Búsqueda</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Biblia, notas, devocionales y diccionario en un solo lugar.
      </Text>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={colors.textMuted} size={18} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Busca un versículo, palabra o nota…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {anyLoading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
      </View>

      {!hasQuery ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Escribe al menos {MIN_QUERY} caracteres para buscar en toda la app.
        </Text>
      ) : null}

      {hasQuery && !anyLoading && totalResults === 0 ? (
        <Card style={styles.emptyCard} dashed>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
            Sin resultados para "{query.trim()}".
          </Text>
        </Card>
      ) : null}

      {verses.items.length > 0 ? (
        <ResultSection
          title="Biblia"
          icon={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
          onSeeAll={() => router.push({ pathname: '/(tabs)/bible', params: { mode: 'search' } })}
        >
          {verses.items.map((verse) => (
            <Card
              key={`${verse.bookId}-${verse.chapter}-${verse.verse}`}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/bible',
                  params: { mode: 'reader', bookId: String(verse.bookId), chapter: String(verse.chapter) },
                })
              }
              style={styles.resultCard}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>
                {verse.bookName} {verse.chapter}:{verse.verse}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                {verse.text}
              </Text>
            </Card>
          ))}
        </ResultSection>
      ) : null}

      {!isGuest && notes.items.length > 0 ? (
        <ResultSection
          title="Notas"
          icon={{ ios: 'note.text', android: 'edit_note', web: 'edit_note' }}
          onSeeAll={() => router.push('/(tabs)/notes')}
        >
          {notes.items.map((note) => (
            <Card key={note.id} onPress={() => router.push(`/note/${note.id}`)} style={styles.resultCard}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                {note.title || 'Nota sin título'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                {note.notebookName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                {stripHtml(note.content) || 'Sin contenido todavía'}
              </Text>
            </Card>
          ))}
        </ResultSection>
      ) : null}

      {!isGuest && devotionals.items.length > 0 ? (
        <ResultSection
          title="Devocionales"
          icon={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
          onSeeAll={() => router.push('/(tabs)/notes')}
        >
          {devotionals.items.map((dev) => (
            <Card key={dev.id} onPress={() => router.push(`/devotional/read/${dev.id}`)} style={styles.resultCard}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                {dev.title}
              </Text>
              {dev.verseRef ? (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{dev.verseRef}</Text>
              ) : null}
            </Card>
          ))}
        </ResultSection>
      ) : null}

      {dictionary.items.length > 0 ? (
        <ResultSection
          title="Diccionario Strong"
          icon={{ ios: 'character.book.closed.fill', android: 'menu_book', web: 'menu_book' }}
          onSeeAll={() => router.push({ pathname: '/(tabs)/bible', params: { mode: 'dictionary' } })}
        >
          {dictionary.items.map((entry) => (
            <Card
              key={entry.strongCode}
              onPress={() => router.push({ pathname: '/(tabs)/bible', params: { mode: 'dictionary', strong: entry.strongCode } })}
              style={styles.resultCard}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>
                {entry.strongCode} · {entry.transliteration}
              </Text>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                {entry.definition}
              </Text>
            </Card>
          ))}
        </ResultSection>
      ) : null}
    </ScrollView>
  );
}

function ResultSection({
  title,
  icon,
  onSeeAll,
  children,
}: {
  title: string;
  icon: SymbolViewProps['name'];
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <SymbolView name={icon} tintColor={colors.primary} size={16} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Pressable onPress={onSeeAll}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Ver más →</Text>
        </Pressable>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: -8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 12 },
  emptyCard: { paddingVertical: 24 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  resultCard: { gap: 4 },
});
