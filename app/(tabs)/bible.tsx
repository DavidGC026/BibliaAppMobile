import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BibleReader } from '@/components/BibleReader';
import { BibleSearch } from '@/components/BibleSearch';
import { ReadingPlansPanel } from '@/components/ReadingPlansPanel';
import { ReferencesExplorer } from '@/components/ReferencesExplorer';
import { StrongDictionary } from '@/components/StrongDictionary';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { useAppTheme } from '@/hooks/useAppTheme';
import { listLocalBibles } from '@/lib/repo';

const OFFLINE_STRIP_MS = 10000;

type BibleMode = 'reader' | 'search' | 'references' | 'dictionary' | 'plans';

const MODES: { key: BibleMode; label: string }[] = [
  { key: 'reader', label: 'Lector' },
  { key: 'search', label: 'Buscar' },
  { key: 'references', label: 'Referencias' },
  { key: 'dictionary', label: 'Diccionario' },
  { key: 'plans', label: 'Planes' },
];

function parseReaderTarget(bookId?: string, chapter?: string) {
  if (!bookId || !chapter) return undefined;
  const b = Number(bookId);
  const c = Number(chapter);
  if (!Number.isFinite(b) || !Number.isFinite(c) || c < 1) return undefined;
  return { bookId: b, chapter: c };
}

function parseVerse(verse?: string) {
  if (!verse) return undefined;
  const v = Number(verse);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

export default function BibleScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string; verse?: string; bibleId?: string; mode?: string; strong?: string }>();
  const [mode, setMode] = useState<BibleMode>(() => {
    const m = params.mode;
    if (m === 'search' || m === 'references' || m === 'dictionary' || m === 'plans') return m;
    return 'reader';
  });
  const [readerTarget, setReaderTarget] = useState(() =>
    parseReaderTarget(params.bookId, params.chapter),
  );
  const [readerBibleId, setReaderBibleId] = useState<number | undefined>(() => {
    const id = Number(params.bibleId);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  });
  // Versículo al que saltar: llega de la lista de versículos con notas.
  const [readerVerse, setReaderVerse] = useState<number | undefined>(() => parseVerse(params.verse));
  const [showOfflineStrip, setShowOfflineStrip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listLocalBibles()
      .then((bibles) => {
        if (!cancelled && !bibles.some((b) => b.downloaded)) setShowOfflineStrip(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showOfflineStrip) return;
    const timer = setTimeout(() => setShowOfflineStrip(false), OFFLINE_STRIP_MS);
    return () => clearTimeout(timer);
  }, [showOfflineStrip]);

  useEffect(() => {
    const target = parseReaderTarget(params.bookId, params.chapter);
    if (target) {
      setReaderTarget(target);
      setMode('reader');
    }
    const id = Number(params.bibleId);
    if (Number.isFinite(id) && id > 0) setReaderBibleId(id);
    setReaderVerse(parseVerse(params.verse));
    const m = params.mode;
    if (m === 'search' || m === 'references' || m === 'dictionary' || m === 'plans' || m === 'reader') {
      setMode(m);
    }
  }, [params.bookId, params.chapter, params.verse, params.bibleId, params.mode]);

  const openInReader = (bookId: number, chapter: number) => {
    setReaderTarget({ bookId, chapter });
    setMode('reader');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <SegmentTabs tabs={MODES} active={mode} onChange={setMode} />

      {showOfflineStrip ? (
        <Pressable
          onPress={() => {
            setShowOfflineStrip(false);
            router.push('/downloads');
          }}
          style={({ pressed }) => [
            styles.offlineStrip,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <SymbolView name={{ ios: 'arrow.down.circle.fill', android: 'download', web: 'download' }} tintColor={colors.primary} size={18} />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', flex: 1 }}>
            Descargar Biblia para leer sin conexión
          </Text>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>Abrir</Text>
        </Pressable>
      ) : null}

      {mode === 'reader' ? (
        <BibleReader
          key={readerTarget ? `${readerTarget.bookId}-${readerTarget.chapter}-${readerVerse ?? ''}-${readerBibleId ?? ''}` : 'default'}
          initialBookId={readerTarget?.bookId}
          initialChapter={readerTarget?.chapter}
          initialVerse={readerVerse}
          initialBibleId={readerBibleId}
        />
      ) : mode === 'search' ? (
        <BibleSearch onOpenVerse={openInReader} />
      ) : mode === 'references' ? (
        <ReferencesExplorer onOpenReference={openInReader} />
      ) : mode === 'dictionary' ? (
        <StrongDictionary initialCode={params.strong} />
      ) : (
        <ReadingPlansPanel />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  offlineStrip: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
