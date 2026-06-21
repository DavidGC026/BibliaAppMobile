import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BibleReader } from '@/components/BibleReader';
import { BibleSearch } from '@/components/BibleSearch';
import { ReadingPlansPanel } from '@/components/ReadingPlansPanel';
import { ReferencesExplorer } from '@/components/ReferencesExplorer';
import { StrongDictionary } from '@/components/StrongDictionary';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { useAppTheme } from '@/hooks/useAppTheme';

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

export default function BibleScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookId?: string; chapter?: string; bibleId?: string; mode?: string }>();
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

  useEffect(() => {
    const target = parseReaderTarget(params.bookId, params.chapter);
    if (target) {
      setReaderTarget(target);
      setMode('reader');
    }
    const id = Number(params.bibleId);
    if (Number.isFinite(id) && id > 0) setReaderBibleId(id);
    const m = params.mode;
    if (m === 'search' || m === 'references' || m === 'dictionary' || m === 'plans' || m === 'reader') {
      setMode(m);
    }
  }, [params.bookId, params.chapter, params.bibleId, params.mode]);

  const openInReader = (bookId: number, chapter: number) => {
    setReaderTarget({ bookId, chapter });
    setMode('reader');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <SegmentTabs tabs={MODES} active={mode} onChange={setMode} />

      {mode === 'reader' ? (
        <BibleReader
          key={readerTarget ? `${readerTarget.bookId}-${readerTarget.chapter}-${readerBibleId ?? ''}` : 'default'}
          initialBookId={readerTarget?.bookId}
          initialChapter={readerTarget?.chapter}
          initialBibleId={readerBibleId}
        />
      ) : mode === 'search' ? (
        <BibleSearch onOpenVerse={openInReader} />
      ) : mode === 'references' ? (
        <ReferencesExplorer onOpenReference={openInReader} />
      ) : mode === 'dictionary' ? (
        <StrongDictionary />
      ) : (
        <ReadingPlansPanel />
      )}
    </View>
  );
}
