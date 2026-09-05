import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getLastPassage } from '@/lib/readerState';
import { repoListBooks } from '@/lib/repo';
import { deleteStudyBook, listStudyBookCaches, type StudyBookCache } from '@/lib/offline/chapterStudyStore';
import { studyBookTargetId } from '@/lib/offline/chapterStudyDownload';
import { enqueueChapterStudyDownload, forgetStudyBookTask, subscribeOfflineDownloads, type OfflineDownloadTask } from '@/lib/offlineDownloadManager';
import { STUDY_LABELS, studyBibleId, type ChapterStudyKind } from '@/lib/study';
import type { BibleVersion, Book } from '@/lib/types';
import { StudyButton, StudySheet, studyStyles } from './StudySheet';

export function ChapterStudyDownloads({ bibles }: { bibles: BibleVersion[] }) {
  const { colors } = useAppTheme();
  const palette = { background: colors.background, text: colors.text, muted: colors.textMuted,
    card: colors.card, border: colors.border, accent: colors.primary, accentSoft: colors.primarySoft };
  const [bibleId, setBibleId] = useState<number | null>(null);
  const [bookId, setBookId] = useState<number | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caches, setCaches] = useState<StudyBookCache[]>([]);
  const [tasks, setTasks] = useState<OfflineDownloadTask[]>([]);
  const [picker, setPicker] = useState<'bible' | 'book' | null>(null);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const currentBible = bibles.find((bible) => bible.bibleId === bibleId);
  const currentBook = books.find((book) => book.bookId === bookId);
  const reloadCaches = useCallback(() => listStudyBookCaches().then(setCaches).catch(() => setError('No se pudieron consultar las descargas locales.')), []);

  useEffect(() => {
    if (bibleId !== null || bibles.length === 0) return;
    let active = true;
    getLastPassage().then((last) => {
      if (!active) return;
      setBibleId(bibles.find((bible) => bible.bibleId === last?.bibleId)?.bibleId ?? bibles[0].bibleId);
      setBookId(last?.bookId ?? null);
    });
    return () => { active = false; };
  }, [bibles, bibleId]);

  useEffect(() => {
    if (bibleId === null) return;
    let active = true;
    setLoading(true);
    setError(null);
    setBooks([]);
    repoListBooks(bibleId).then(({ books: available }) => {
      if (!active) return;
      setBooks(available);
      setBookId((previous) => available.some((book) => book.bookId === previous) ? previous : available[0]?.bookId ?? null);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los libros.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bibleId, attempt]);

  useEffect(() => {
    let completed = '';
    reloadCaches();
    return subscribeOfflineDownloads((next) => {
      setTasks(next);
      const nextCompleted = next.filter((task) => task.kind === 'interlinear' || task.kind === 'commentaries')
        .map((task) => `${task.id}:${task.status}:${task.progress?.current ?? 0}`).join('|');
      if (nextCompleted !== completed) {
        completed = nextCompleted;
        reloadCaches();
      }
    });
  }, [reloadCaches]);

  async function start(kind: ChapterStudyKind, refresh = false) {
    if (bibleId === null || !currentBook) return;
    try {
      await enqueueChapterStudyDownload(kind, { ...currentBook, bibleId, refresh });
    } catch (reason) {
      Alert.alert('Descarga de estudio', reason instanceof Error ? reason.message : 'No se pudo iniciar.');
    }
  }

  function remove(kind: ChapterStudyKind, targetBibleId: number, targetBookId: number) {
    Alert.alert('Eliminar descarga', `¿Quitar ${STUDY_LABELS[kind].toLowerCase()} de este libro del dispositivo?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await forgetStudyBookTask(kind, targetBibleId, targetBookId);
          await deleteStudyBook(kind, targetBibleId, targetBookId);
          await reloadCaches();
        } catch (reason) {
          Alert.alert('No se pudo eliminar', reason instanceof Error ? reason.message : 'Inténtalo de nuevo.');
        }
      } },
    ]);
  }

  const choices = (picker === 'bible'
    ? bibles.map((bible) => ({ id: bible.bibleId, label: `${bible.abbr} · ${bible.name}` }))
    : books.map((book) => ({ id: book.bookId, label: book.bookName })))
    .filter((choice) => choice.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Estudio por libro</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
        Elige los libros que necesitas. El interlineal incluye las fichas Strong y se comparte entre versiones.
        Los comentarios disponibles se guardan con la versión elegida. Los capítulos consultados también quedan guardados automáticamente.
      </Text>
      <View style={studyStyles.row}>
        <StudyButton label={`Versión: ${currentBible?.abbr ?? 'Elegir'}`} palette={palette}
          disabled={!bibles.length} onPress={() => { setQuery(''); setPicker('bible'); }} />
        <StudyButton label={`Libro: ${currentBook?.bookName ?? 'Elegir'}`} palette={palette}
          disabled={loading || !books.length} onPress={() => { setQuery(''); setPicker('book'); }} />
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Cargando libros" color={colors.primary} /> : null}
      {!bibles.length ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Conéctate para cargar el catálogo de versiones y libros.</Text> : null}
      {error ? <View style={{ gap: 8 }}><Text style={{ color: colors.danger }}>{error}</Text>
        <StudyButton label="Reintentar" palette={palette} onPress={() => { setAttempt((value) => value + 1); reloadCaches(); }} /></View> : null}
      {currentBook && bibleId !== null ? (['interlinear', 'commentaries'] as const).map((kind) => {
        if (kind === 'interlinear' && currentBible?.hasInterlinear !== true) return null;
        const targetId = studyBookTargetId(kind, bibleId, currentBook.bookId);
        const task = tasks.find((item) => item.kind === kind && item.targetId === targetId);
        const cache = caches.find((item) => item.kind === kind && item.bibleId === studyBibleId(kind, bibleId) && item.bookId === currentBook.bookId);
        const busy = task?.status === 'running' || task?.status === 'queued';
        const complete = (cache?.chapters ?? 0) >= currentBook.chapters;
        return (
          <View key={kind} style={[studyStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{STUDY_LABELS[kind]} · {currentBook.bookName}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
              {cache?.chapters ?? 0} de {currentBook.chapters} capítulos guardados · {cache?.items ?? 0} {kind === 'interlinear' ? 'palabras' : 'comentarios'}
            </Text>
            {kind === 'commentaries' ? <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>Algunos capítulos aún no tienen comentarios publicados. Actualizar comprueba si hay contenido nuevo.</Text> : null}
            {busy ? (
              <View accessibilityLiveRegion="polite" style={studyStyles.row}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.text }}>{task.status === 'queued' ? 'En cola' : `${task.progress?.current ?? 0} / ${task.progress?.total ?? currentBook.chapters} capítulos`}</Text>
              </View>
            ) : (
              <View style={studyStyles.row}>
                <StudyButton label={task?.status === 'error' ? 'Reintentar' : complete ? 'Actualizar' : cache ? 'Completar libro' : 'Descargar libro'}
                  palette={palette} onPress={() => start(kind, task?.status === 'error' ? task.studyBook?.refresh : complete)} />
                {cache ? <StudyButton label="Eliminar" palette={palette} onPress={() => remove(kind, bibleId, currentBook.bookId)} /> : null}
              </View>
            )}
            {task?.status === 'error' ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 14 }}>{task.error}</Text> : null}
          </View>
        );
      }) : null}
      {tasks.filter((task) => (task.kind === 'interlinear' || task.kind === 'commentaries') && task.status !== 'done' &&
        task.targetId !== studyBookTargetId(task.kind, bibleId ?? 0, bookId ?? 0)).map((task) => (
        <View key={task.id} style={[studyStyles.card, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{task.label}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            {task.status === 'error' ? task.error : task.status === 'queued' ? 'En cola' : `${task.progress?.current ?? 0} / ${task.progress?.total ?? task.studyBook?.chapters ?? 0} capítulos`}
          </Text>
          {task.status === 'error' && task.studyBook ? (
            <StudyButton label="Reintentar descarga" palette={palette} onPress={() => {
              if ((task.kind === 'interlinear' || task.kind === 'commentaries') && task.studyBook) {
                enqueueChapterStudyDownload(task.kind, task.studyBook).catch((reason) => Alert.alert('Descarga de estudio', String(reason)));
              }
            }} />
          ) : <ActivityIndicator color={colors.primary} />}
        </View>
      ))}
      {caches.filter((cache) => cache.bookId !== bookId || (cache.kind === 'commentaries' && cache.bibleId !== bibleId)).map((cache) => {
        const busy = tasks.some((task) => task.kind === cache.kind && task.targetId === studyBookTargetId(cache.kind, cache.bibleId, cache.bookId) &&
          (task.status === 'running' || task.status === 'queued'));
        return (
          <View key={`${cache.kind}:${cache.bibleId}:${cache.bookId}`} style={[studyStyles.card, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>{STUDY_LABELS[cache.kind]} · {books.find((book) => book.bookId === cache.bookId)?.bookName ?? `Libro ${cache.bookId}`}
              {cache.kind === 'commentaries' ? ` · ${bibles.find((bible) => bible.bibleId === cache.bibleId)?.abbr ?? 'Otra versión'}` : ''}</Text>
            <Text style={{ color: colors.textMuted }}>{cache.chapters} capítulos guardados</Text>
            <StudyButton label="Eliminar copia" palette={palette} disabled={busy} onPress={() => remove(cache.kind, cache.bibleId, cache.bookId)} />
          </View>
        );
      })}
      {picker ? (
        <StudySheet title={picker === 'bible' ? 'Elegir versión' : 'Elegir libro'} reference="Descargas de estudio" palette={palette} onClose={() => setPicker(null)}>
          <TextInput accessibilityLabel="Buscar versión o libro" placeholder="Buscar" placeholderTextColor={colors.textMuted}
            value={query} onChangeText={setQuery} style={{ margin: 16, padding: 12, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.text, fontSize: 16 }} />
          <FlatList data={choices} keyExtractor={(item) => String(item.id)} keyboardShouldPersistTaps="handled"
            contentContainerStyle={studyStyles.content}
            ListEmptyComponent={<Text style={{ color: colors.textMuted }}>No hay resultados.</Text>}
            renderItem={({ item }) => <StudyButton label={item.label} palette={palette} onPress={() => {
              if (picker === 'bible') setBibleId(item.id); else setBookId(item.id);
              setPicker(null);
            }} />}
          />
        </StudySheet>
      ) : null}
    </View>
  );
}
