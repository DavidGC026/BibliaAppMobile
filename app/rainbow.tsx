import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  areCrossRefsDownloaded,
  downloadCrossReferences,
  getChapterArcs,
  repoListBooks,
  type StudyDownloadProgress,
} from '@/lib/repo';
import { getRainbowHtml } from '@/lib/rainbowHtml';
import { DEFAULT_BIBLE_ID } from '@/lib/config';

type Phase = 'checking' | 'needsDownload' | 'downloading' | 'building' | 'ready' | 'error';

export default function RainbowScreen() {
  const { colors, isDark } = useAppTheme();
  const [phase, setPhase] = useState<Phase>('checking');
  const [progress, setProgress] = useState<StudyDownloadProgress | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const landscapeRef = useRef(false);
  const [landscape, setLandscape] = useState(false);

  // En esta pantalla se permite rotar el dispositivo; al salir se vuelve a vertical
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const toggleLandscape = useCallback(() => {
    const next = !landscapeRef.current;
    landscapeRef.current = next;
    setLandscape(next);
    if (next) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .then(() => ScreenOrientation.unlockAsync())
        .catch(() => {});
    }
  }, []);

  const orientationButton = (
    <Pressable onPress={toggleLandscape} hitSlop={12} style={{ paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 18 }}>{landscape ? '\u{1F4F1}' : '\u{1F504}'}</Text>
    </Pressable>
  );

  const build = useCallback(async () => {
    setPhase('building');
    try {
      const { keys, arcs } = await getChapterArcs();
      if (keys.length === 0) throw new Error('No hay referencias descargadas');

      let bookNames = new Map<number, string>();
      try {
        const { books } = await repoListBooks(DEFAULT_BIBLE_ID);
        bookNames = new Map(books.map((b) => [b.bookId, b.bookName]));
      } catch {
        // Sin catálogo de libros: se usan etiquetas genéricas
      }

      const labels: string[] = [];
      const bookIdx: number[] = [];
      const bookNameList: string[] = [];
      const chap: number[] = [];
      let lastBook = -1;
      let bookCounter = -1;
      for (const key of keys) {
        const bookId = Math.floor(key / 1000);
        const chapter = key % 1000;
        if (bookId !== lastBook) {
          lastBook = bookId;
          bookCounter++;
          bookNameList.push(bookNames.get(bookId) ?? `Libro ${bookId}`);
        }
        labels.push(`${bookNames.get(bookId) ?? `Libro ${bookId}`} ${chapter}`);
        bookIdx.push(bookCounter);
        chap.push(chapter);
      }

      setHtml(
        getRainbowHtml(
          {
            dark: isDark,
            background: colors.background,
            text: colors.text,
            textMuted: colors.textMuted,
            border: colors.border,
          },
          { labels, bookIdx, bookNames: bookNameList, chap, arcs },
        ),
      );
      setPhase('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setPhase('error');
    }
  }, [colors, isDark]);

  useEffect(() => {
    (async () => {
      if (await areCrossRefsDownloaded()) {
        await build();
      } else {
        setPhase('needsDownload');
      }
    })();
  }, [build]);

  const startDownload = async () => {
    setPhase('downloading');
    try {
      await downloadCrossReferences((p) => setProgress(p));
      await build();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar');
      setPhase('error');
    }
  };

  if (phase === 'ready' && html) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerRight: () => orientationButton }} />
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ backgroundColor: colors.background }}
          javaScriptEnabled
          domStorageEnabled={false}
          setSupportMultipleWindows={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {phase === 'needsDownload' ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Mapa de referencias</Text>
          <Text style={[styles.msg, { color: colors.textMuted }]}>
            Cada arco conecta dos capítulos de la Biblia que se citan entre sí: 344.000 conexiones
            dibujadas como un arcoíris. Para verlo, descarga primero las referencias cruzadas.
          </Text>
          <Button label="Descargar referencias" onPress={startDownload} />
        </>
      ) : phase === 'error' ? (
        <>
          <Text style={[styles.msg, { color: colors.textMuted }]}>{error}</Text>
          <Button label="Reintentar" variant="outline" onPress={startDownload} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.msg, { color: colors.textMuted }]}>
            {phase === 'downloading'
              ? `Descargando referencias${progress ? ` (${progress.current}/${progress.total})` : ''}…`
              : phase === 'building'
                ? 'Preparando visualización…'
                : 'Comprobando datos…'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  msg: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
