import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OfflineBanner } from '@/components/OfflineBanner';
import { BibleSelectorModal } from '@/components/BibleSelectorModal';
import { CrossReferencesModal } from '@/components/CrossReferencesModal';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import * as repo from '@/lib/repo';
import type { BibleVersion, Book, Verse, VerseHighlight, VerseNoteLink } from '@/lib/types';
import { HIGHLIGHT_COLORS, getHighlightTheme, verseHighlightStyle } from '@/lib/highlightColors';

export function BibleReader({
  initialBookId,
  initialChapter,
  initialBibleId,
}: {
  initialBookId?: number;
  initialChapter?: number;
  initialBibleId?: number;
} = {}) {
  const { colors, radius, shadow, isDark } = useAppTheme();
  const { isGuest } = useAuth();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [notes, setNotes] = useState<VerseNoteLink[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [refsModalOpen, setRefsModalOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterFavorites, setChapterFavorites] = useState<Map<number, number>>(new Map());

  const selectedBook = books.find((b) => b.bookId === bookId) ?? null;
  const maxChapter = selectedBook?.chapters ?? 1;
  const currentBible = bibles.find((b) => b.bibleId === bibleId);
  const highlightMap = new Map(highlights.map((h) => [h.verse, h.color]));
  const noteMap = new Map(notes.map((n) => [n.verse, n]));

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        setLoading(true);
        setError(null);
        const { bibles: bibleList } = await repo.repoListBibles();
        if (cancelled) return;
        setBibles(bibleList);
        const initialBible =
          (initialBibleId && bibleList.some((b) => b.bibleId === initialBibleId)
            ? initialBibleId
            : null) ??
          bibleList.find((b) => b.bibleId === DEFAULT_BIBLE_ID)?.bibleId ??
          bibleList[0]?.bibleId ??
          DEFAULT_BIBLE_ID;
        setBibleId(initialBible);
        const { books: bookList } = await repo.repoListBooks(initialBible);
        if (cancelled) return;
        setBooks(bookList);
        const startBookId = initialBookId && bookList.some((b) => b.bookId === initialBookId)
          ? initialBookId
          : bookList[0]?.bookId ?? null;
        setBookId(startBookId);
        setChapter(initialChapter && initialChapter > 0 ? initialChapter : 1);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar la Biblia');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInitial();
    return () => { cancelled = true; };
  }, []);

  // Navegación externa (versículo del día, referencias, etc.)
  useEffect(() => {
    if (!initialBookId || !initialChapter || books.length === 0) return;
    if (!books.some((b) => b.bookId === initialBookId)) return;
    setBookId(initialBookId);
    setChapter(initialChapter);
    setSelectedVerse(null);
  }, [initialBookId, initialChapter, books]);

  const loadChapter = useCallback(async () => {
    if (!bookId) return;
    try {
      setLoadingChapter(true);
      setError(null);
      setSelectedVerse(null);
      const [{ verses: chapterVerses }, hl, ln, favMap] = await Promise.all([
        repo.repoGetVerses(bibleId, bookId, chapter),
        isGuest ? Promise.resolve({ highlights: [] as VerseHighlight[] }) : repo.repoGetHighlights(bookId, chapter, bibleId),
        isGuest ? Promise.resolve({ links: [] as VerseNoteLink[] }) : repo.repoGetChapterNotes(bookId, chapter),
        isGuest ? Promise.resolve(new Map<number, number>()) : repo.repoGetChapterFavorites(bibleId, bookId, chapter),
      ]);
      setVerses(chapterVerses);
      setHighlights(hl.highlights);
      setNotes(ln.links);
      setChapterFavorites(favMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el capítulo');
      setVerses([]);
    } finally {
      setLoadingChapter(false);
    }
  }, [bibleId, bookId, chapter, isGuest]);

  useEffect(() => {
    if (bookId) loadChapter();
  }, [bookId, chapter, bibleId, isGuest, loadChapter]);

  // Registrar lectura tras 5s (web: bible-reader/index.tsx)
  useEffect(() => {
    if (!bookId || verses.length === 0 || isGuest) return;
    const timer = setTimeout(() => {
      api.recordReadingActivity(bookId, 1, verses.length).catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [bookId, chapter, verses.length, isGuest]);

  const changeVersion = async (nextBibleId: number) => {
    setVersionOpen(false);
    if (nextBibleId === bibleId) return;
    setBibleId(nextBibleId);
    try {
      const { books: bookList } = await repo.repoListBooks(nextBibleId);
      setBooks(bookList);
      if (!bookList.some((b) => b.bookId === bookId)) {
        setBookId(bookList[0]?.bookId ?? null);
        setChapter(1);
      }
    } catch {
      // El capítulo se recargará con la versión nueva igualmente.
    }
  };

  const applyHighlight = async (color: string) => {
    if (!bookId || selectedVerse === null || isGuest) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(bookId, chapter, [selectedVerse], color, bibleId);
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  const removeHighlight = async () => {
    if (!bookId || selectedVerse === null || isGuest) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(bookId, chapter, [selectedVerse], null, bibleId);
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async () => {
    if (!bookId || selectedVerse === null || isGuest) return;
    setSaving(true);
    try {
      const existingId = chapterFavorites.get(selectedVerse);
      if (existingId) {
        await repo.repoDeleteFavorite(existingId);
        Alert.alert('Favoritos', 'Versículo quitado de favoritos');
      } else {
        await repo.repoAddFavorite(bibleId, bookId, chapter, selectedVerse);
        Alert.alert('Favoritos', '¡Versículo agregado a favoritos!');
      }
      await loadChapter();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    } finally {
      setSaving(false);
    }
  };

  const openNoteModal = () => {
    if (selectedVerse === null) return;
    const existing = noteMap.get(selectedVerse);
    setNoteText(existing?.noteContent ?? '');
    setNoteModalOpen(true);
  };

  const saveNote = async () => {
    if (!bookId || selectedVerse === null || isGuest) return;
    setSaving(true);
    try {
      await repo.repoSaveVerseNote(bookId, chapter, selectedVerse, noteText.trim());
      setNoteModalOpen(false);
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (selectedVerse === null || isGuest) return;
    const link = noteMap.get(selectedVerse);
    if (!link?.id) return;
    setSaving(true);
    try {
      await repo.repoDeleteVerseNote(link.id);
      setNoteModalOpen(false);
      setNoteText('');
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isGuest ? (
          <Pressable
            style={[styles.guestBanner, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}
            onPress={() => router.push('/login')}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>
              Inicia sesión para resaltar versículos y añadir notas.
            </Text>
          </Pressable>
        ) : null}

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <View style={styles.headingRow}>
          <Text style={[styles.chapterHeading, { color: colors.text }]} numberOfLines={1}>
            {selectedBook?.bookName ?? ''} {chapter}
          </Text>
          <Pressable
            style={[styles.versionPill, { backgroundColor: colors.muted, borderRadius: radius.full }]}
            onPress={() => setVersionOpen(true)}
          >
            <Text style={[styles.versionText, { color: colors.text }]}>
              {currentBible?.abbr ?? 'Versión'}
            </Text>
            <Text style={[styles.caret, { color: colors.textMuted }]}>▾</Text>
          </Pressable>
        </View>

        {loadingChapter ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.verses}>
            {verses.map((v) => {
              const hl = highlightMap.get(v.verse);
              const hasNote = noteMap.has(v.verse);
              const isSelected = selectedVerse === v.verse;
              return (
                <Pressable
                  key={v.verse}
                  onPress={() => setSelectedVerse(isSelected ? null : v.verse)}
                  style={[
                    styles.verseRow,
                    hl && !isSelected ? verseHighlightStyle(hl, isDark) : null,
                    isSelected ? { backgroundColor: colors.primarySoft, borderRadius: 6, paddingLeft: 8 } : null,
                  ]}
                >
                  <Text style={[styles.verseLine, { color: colors.text }]}>
                    <Text style={[styles.verseNum, { color: colors.primary }]}>
                      {v.verse}
                      {hasNote ? ' 📝' : ''}{' '}
                    </Text>
                    {v.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {selectedVerse !== null ? (
        <View style={[styles.actionBar, shadow.md, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl }]}>
          <Text style={[styles.actionLabel, { color: colors.textMuted }]}>
            {selectedBook?.bookName} {chapter}:{selectedVerse}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {!isGuest
              ? HIGHLIGHT_COLORS.map((c) => {
                  const theme = getHighlightTheme(c);
                  return (
                    <Pressable
                      key={c}
                      disabled={saving}
                      style={[
                        styles.colorBtn,
                        {
                          backgroundColor: theme?.swatch ?? c,
                          borderWidth: 1,
                          borderColor: `${theme?.accent ?? c}33`,
                        },
                      ]}
                      onPress={() => applyHighlight(c)}
                    />
                  );
                })
              : null}
            {!isGuest ? (
              <Pressable style={[styles.toolBtn, { borderColor: colors.border }]} onPress={removeHighlight}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Quitar</Text>
              </Pressable>
            ) : null}
            {!isGuest ? (
              <Pressable
                style={[styles.toolBtn, { borderColor: selectedVerse !== null && chapterFavorites.has(selectedVerse) ? '#F59E0B' : colors.border }]}
                onPress={toggleFavorite}
                disabled={saving}
              >
                <Text
                  style={{
                    color: selectedVerse !== null && chapterFavorites.has(selectedVerse) ? '#F59E0B' : colors.textMuted,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  {selectedVerse !== null && chapterFavorites.has(selectedVerse) ? '★' : '☆'}
                </Text>
              </Pressable>
            ) : null}
            {!isGuest ? (
              <Pressable style={[styles.toolBtn, { borderColor: colors.primary }]} onPress={openNoteModal}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Nota</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.toolBtn, { borderColor: colors.primary }]} onPress={() => setRefsModalOpen(true)}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Referencias</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.bottomNav, shadow.md, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.full }]}>
          <Pressable
            style={[styles.navArrow, { opacity: chapter <= 1 ? 0.3 : 1 }]}
            onPress={() => setChapter((c) => Math.max(1, c - 1))}
            disabled={chapter <= 1}
            hitSlop={8}
          >
            <Text style={[styles.navArrowText, { color: colors.text }]}>‹</Text>
          </Pressable>
          <Pressable style={styles.navCenter} onPress={() => setSelectorOpen(true)}>
            <Text style={[styles.navCenterText, { color: colors.text }]} numberOfLines={1}>
              {(selectedBook?.bookName ?? '—').toUpperCase()} {chapter}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.navArrow, { opacity: chapter >= maxChapter ? 0.3 : 1 }]}
            onPress={() => setChapter((c) => Math.min(maxChapter, c + 1))}
            disabled={chapter >= maxChapter}
            hitSlop={8}
          >
            <Text style={[styles.navArrowText, { color: colors.text }]}>›</Text>
          </Pressable>
        </View>
      )}

      <BibleSelectorModal
        visible={selectorOpen}
        books={books}
        currentBookId={bookId}
        onSelect={(nextBookId, nextChapter) => {
          setBookId(nextBookId);
          setChapter(nextChapter);
          setSelectedVerse(null);
        }}
        onClose={() => setSelectorOpen(false)}
      />

      <Modal visible={versionOpen} animationType="slide" transparent onRequestClose={() => setVersionOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setVersionOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Versión</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {bibles.map((b) => {
                const active = b.bibleId === bibleId;
                return (
                  <Pressable
                    key={b.bibleId}
                    style={[styles.versionRow, { borderBottomColor: colors.border }]}
                    onPress={() => changeVersion(b.bibleId)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '700', fontSize: 15 }}>
                        {b.abbr}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{b.name}</Text>
                    </View>
                    {active ? <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={noteModalOpen} animationType="slide" transparent onRequestClose={() => setNoteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nota — v. {selectedVerse}
            </Text>
            <TextInput
              style={[styles.noteInput, { borderColor: colors.border, color: colors.text }]}
              multiline
              placeholder="Escribe tu nota..."
              placeholderTextColor={colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
            />
            <View style={styles.modalActions}>
              {noteMap.get(selectedVerse ?? -1)?.id ? (
                <Pressable onPress={deleteNote} disabled={saving}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Eliminar</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => setNoteModalOpen(false)}>
                  <Text style={{ color: colors.textMuted }}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={saveNote} disabled={saving}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <CrossReferencesModal
        visible={refsModalOpen}
        bibleId={bibleId}
        bookId={bookId}
        chapter={chapter}
        verse={selectedVerse}
        reference={`${selectedBook?.bookName ?? ''} ${chapter}:${selectedVerse ?? ''}`}
        onClose={() => setRefsModalOpen(false)}
        onOpenReference={(refBookId, refChapter) => {
          if (books.some((b) => b.bookId === refBookId)) {
            setBookId(refBookId);
            setChapter(refChapter);
            setSelectedVerse(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  versionText: { fontSize: 13, fontWeight: '700' },
  caret: { fontSize: 11 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },
  guestBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  error: { textAlign: 'center', fontSize: 14, marginBottom: 8 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  chapterHeading: { flex: 1, fontSize: 26, fontWeight: '800' },
  verses: { gap: 6 },
  verseRow: { paddingVertical: 4, paddingHorizontal: 4 },
  verseLine: { fontSize: 19, lineHeight: 32 },
  verseNum: { fontWeight: '700', fontSize: 13 },
  actionBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },
  toolBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  bottomNav: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 220,
  },
  navArrow: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  navArrowText: { fontSize: 26, fontWeight: '400', lineHeight: 28 },
  navCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  navCenterText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  versionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 120,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
