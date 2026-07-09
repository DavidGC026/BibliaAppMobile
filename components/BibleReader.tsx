import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { BibleSelectorModal } from '@/components/BibleSelectorModal';
import { CrossReferencesModal } from '@/components/CrossReferencesModal';
import { VerseImageCreator } from '@/components/VerseImageCreator';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import * as repo from '@/lib/repo';
import { buildImageCreatorData, buildSelectionShareText, formatVerseRange } from '@/lib/verseUtils';
import { cancelStreakReminderForToday } from '@/lib/localNotifications';
import { markReadToday } from '@/lib/readingToday';
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
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const contentPadding = 110 + insets.bottom + keyboardHeight;
  const { isGuest } = useAuth();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [notes, setNotes] = useState<VerseNoteLink[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const lastSelectedRef = useRef<number | null>(null);
  const [imageCreatorOpen, setImageCreatorOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const initialNoteTextRef = useRef('');
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

  const primaryVerse = selectedVerses.length === 1 ? selectedVerses[0] : null;
  const selectionLabel =
    selectedVerses.length > 0
      ? `${selectedBook?.bookName ?? ''} ${chapter}:${formatVerseRange(selectedVerses)}`
      : '';
  const imageCreatorData = useMemo(() => {
    if (!selectedBook || selectedVerses.length === 0) return null;
    return buildImageCreatorData({
      selectedVerses,
      verses,
      bookName: selectedBook.bookName,
      chapter,
      bibleAbbr: currentBible?.abbr ?? 'RVR1960',
    });
  }, [selectedVerses, verses, selectedBook, chapter, currentBible?.abbr]);

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
    setSelectedVerses([]);
    lastSelectedRef.current = null;
  }, [initialBookId, initialChapter, books]);

  const loadChapter = useCallback(async () => {
    if (!bookId) return;
    try {
      setLoadingChapter(true);
      setError(null);
      setSelectedVerses([]);
      lastSelectedRef.current = null;
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
      if (!isGuest) {
        markReadToday().then(() => cancelStreakReminderForToday()).catch(() => {});
      }
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

  const toggleVerseSelection = useCallback((verseNum: number) => {
    setSelectedVerses((prev) => {
      lastSelectedRef.current = verseNum;
      if (prev.includes(verseNum)) return prev.filter((x) => x !== verseNum);
      return [...prev, verseNum].sort((a, b) => a - b);
    });
  }, []);

  const selectRangeTo = useCallback((verseNum: number) => {
    setSelectedVerses((prev) => {
      const anchor =
        lastSelectedRef.current !== null && prev.includes(lastSelectedRef.current)
          ? lastSelectedRef.current
          : prev[0] ?? verseNum;
      const start = Math.min(anchor, verseNum);
      const end = Math.max(anchor, verseNum);
      const range: number[] = [];
      for (let i = start; i <= end; i++) range.push(i);
      lastSelectedRef.current = verseNum;
      return Array.from(new Set([...prev, ...range])).sort((a, b) => a - b);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
    lastSelectedRef.current = null;
  }, []);

  const applyHighlight = async (color: string) => {
    if (!bookId || selectedVerses.length === 0 || isGuest) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(bookId, chapter, selectedVerses, color, bibleId);
      clearSelection();
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  const removeHighlight = async () => {
    if (!bookId || selectedVerses.length === 0 || isGuest) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(bookId, chapter, selectedVerses, null, bibleId);
      clearSelection();
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  const addFavorites = async () => {
    if (!bookId || selectedVerses.length === 0 || isGuest) return;
    setSaving(true);
    try {
      for (const v of selectedVerses) {
        if (!chapterFavorites.has(v)) {
          await repo.repoAddFavorite(bibleId, bookId, chapter, v);
        }
      }
      Alert.alert('Favoritos', '¡Versículos agregados a favoritos!');
      clearSelection();
      await loadChapter();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    } finally {
      setSaving(false);
    }
  };

  const handleCopySelection = async () => {
    if (!bookId || !selectedBook) return;
    const share = buildSelectionShareText({
      selectedVerses,
      verses,
      bookName: selectedBook.bookName,
      bookId,
      chapter,
      bibleId,
      bibleAbbr: currentBible?.abbr ?? 'RVR1960',
    });
    if (!share) return;
    await Clipboard.setStringAsync(share.text);
    Alert.alert('Copiado', 'Versículos copiados al portapapeles');
  };

  const handleShareSelection = async () => {
    if (!bookId || !selectedBook) return;
    const share = buildSelectionShareText({
      selectedVerses,
      verses,
      bookName: selectedBook.bookName,
      bookId,
      chapter,
      bibleId,
      bibleAbbr: currentBible?.abbr ?? 'RVR1960',
    });
    if (!share) return;
    try {
      await Share.share({ title: share.title, message: share.text, url: share.url });
    } catch {
      // usuario canceló
    }
  };

  const openNoteModal = () => {
    if (primaryVerse === null) return;
    const existing = noteMap.get(primaryVerse);
    const text = existing?.noteContent ?? '';
    setNoteText(text);
    initialNoteTextRef.current = text;
    setNoteModalOpen(true);
  };

  const closeNoteModal = async () => {
    const trimmed = noteText.trim();
    const initialTrimmed = initialNoteTextRef.current.trim();
    if (
      !isGuest &&
      bookId &&
      primaryVerse !== null &&
      trimmed !== initialTrimmed
    ) {
      setSaving(true);
      try {
        await repo.repoSaveVerseNote(bookId, chapter, primaryVerse, trimmed);
        await loadChapter();
      } catch {
        Alert.alert('Error', 'No se pudo guardar la nota automáticamente.');
        return;
      } finally {
        setSaving(false);
      }
    }
    setNoteModalOpen(false);
  };

  const saveNote = async () => {
    if (!bookId || primaryVerse === null || isGuest) return;
    setSaving(true);
    try {
      await repo.repoSaveVerseNote(bookId, chapter, primaryVerse, noteText.trim());
      setNoteModalOpen(false);
      await loadChapter();
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (primaryVerse === null || isGuest) return;
    const link = noteMap.get(primaryVerse);
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
        contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
              const isSelected = selectedVerses.includes(v.verse);
              return (
                <Pressable
                  key={v.verse}
                  onPress={() => toggleVerseSelection(v.verse)}
                  onLongPress={() => selectRangeTo(v.verse)}
                  delayLongPress={400}
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

      {selectedVerses.length > 0 ? (
        <View style={[styles.actionBar, shadow.md, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.xl, bottom: 16 + insets.bottom + keyboardHeight }]}>
          <View style={styles.actionHeader}>
            <Text style={[styles.actionLabel, { color: colors.textMuted }]} numberOfLines={1}>
              {selectionLabel}
            </Text>
            <Pressable onPress={clearSelection} hitSlop={8}>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>×</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            <Pressable style={[styles.toolBtn, { borderColor: colors.primary }]} onPress={handleShareSelection}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Compartir</Text>
            </Pressable>
            <Pressable style={[styles.toolBtn, { borderColor: colors.primary }]} onPress={handleCopySelection}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Copiar</Text>
            </Pressable>
            <Pressable
              style={[styles.toolBtn, { borderColor: colors.primary, opacity: imageCreatorData ? 1 : 0.4 }]}
              onPress={() => imageCreatorData && setImageCreatorOpen(true)}
              disabled={!imageCreatorData}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Imagen</Text>
            </Pressable>
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
              <Pressable style={[styles.toolBtn, { borderColor: '#F59E0B' }]} onPress={addFavorites} disabled={saving}>
                <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '700' }}>☆</Text>
              </Pressable>
            ) : null}
            {!isGuest && primaryVerse !== null ? (
              <Pressable style={[styles.toolBtn, { borderColor: colors.primary }]} onPress={openNoteModal}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Nota</Text>
              </Pressable>
            ) : null}
            {primaryVerse !== null ? (
              <Pressable style={[styles.toolBtn, { borderColor: colors.primary }]} onPress={() => setRefsModalOpen(true)}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Referencias</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.bottomNav, shadow.md, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.full, bottom: 16 + insets.bottom + keyboardHeight }]}>
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
          setSelectedVerses([]);
          lastSelectedRef.current = null;
        }}
        onClose={() => setSelectorOpen(false)}
      />

      <Modal visible={versionOpen} animationType="slide" transparent onRequestClose={() => setVersionOpen(false)}>
        <Pressable style={[styles.modalOverlay, { paddingBottom: insets.bottom }]} onPress={() => setVersionOpen(false)}>
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

      <Modal visible={noteModalOpen} animationType="slide" transparent onRequestClose={() => void closeNoteModal()}>
        <View style={[styles.modalOverlay, { paddingBottom: insets.bottom + keyboardHeight }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nota — v. {primaryVerse}
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
              {noteMap.get(primaryVerse ?? -1)?.id ? (
                <Pressable onPress={deleteNote} disabled={saving}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Eliminar</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable onPress={() => void closeNoteModal()} disabled={saving}>
                  <Text style={{ color: colors.textMuted }}>Cerrar</Text>
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
        verse={primaryVerse}
        reference={`${selectedBook?.bookName ?? ''} ${chapter}:${primaryVerse ?? ''}`}
        onClose={() => setRefsModalOpen(false)}
        onOpenReference={(refBookId, refChapter) => {
          if (books.some((b) => b.bookId === refBookId)) {
            setBookId(refBookId);
            setChapter(refChapter);
            setSelectedVerses([]);
            lastSelectedRef.current = null;
          }
        }}
      />

      {imageCreatorData ? (
        <VerseImageCreator
          visible={imageCreatorOpen}
          onClose={() => setImageCreatorOpen(false)}
          text={imageCreatorData.text}
          reference={imageCreatorData.reference}
          abbr={imageCreatorData.abbr}
        />
      ) : null}
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
  content: { paddingHorizontal: 20, paddingTop: 12 },
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
  actionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actionLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
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
