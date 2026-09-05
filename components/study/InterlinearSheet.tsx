import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
import { useChapterStudy } from '@/hooks/useChapterStudy';
import { groupInterlinearWords, interlinearLanguageLabel, type InterlinearWord, type StudyPassage } from '@/lib/study';
import { readableOriginal, studyVerseNumbers, studyVerseReference } from '@/lib/studyPresentation';
import type { Verse } from '@/lib/types';
import { InterlinearWordDetails } from './InterlinearWordDetails';
import { StudyPassageQuote, StudyVerseNavigation, StudyVersePicker } from './StudyPassage';
import { StudyFeedback, StudyFooter, StudySheet, studyReadingFont, studyStyles, type StudyPalette } from './StudySheet';

export function InterlinearSheet({ passage, bookName, verses, initialVerse, palette, onClose, bibleAbbr, fontSize = 19 }: {
  passage: StudyPassage; bookName: string; verses: Verse[]; initialVerse: number | null;
  palette: StudyPalette; onClose: () => void; bibleAbbr?: string; fontSize?: number;
}) {
  const [selectedVerse, setSelectedVerse] = useState(initialVerse ?? 1);
  const [activeWord, setActiveWord] = useState<InterlinearWord | null>(null);
  const [lastPosition, setLastPosition] = useState<number | null>(null);
  const [choosingVerse, setChoosingVerse] = useState(false);
  const { result, loading, error, retry } = useChapterStudy('interlinear', passage);
  const groups = useMemo(() => groupInterlinearWords(result?.content ?? []), [result?.content]);
  const numbers = useMemo(() => studyVerseNumbers(verses.map((verse) => verse.verse), result?.content ?? [], initialVerse), [verses, result?.content, initialVerse]);
  const words = groups.get(selectedVerse) ?? [];
  const reference = `${bookName} ${passage.chapter}`;
  const verseReference = studyVerseReference(reference, selectedVerse);
  const text = verses.find((verse) => verse.verse === selectedVerse)?.text;
  const language = words.length ? interlinearLanguageLabel(words) : passage.bookId <= 39 ? 'Hebreo / arameo' : 'Griego';
  const englishGlosses = words.some((word) => !word.glossEs && word.glossEn);
  const showReading = !activeWord && !choosingVerse;
  const feedback = { loading, error, offlineAvailable: result?.offlineAvailable, hasContent: Boolean(result?.content.length), palette, onRetry: retry };

  function changeVerse(verse: number) {
    setSelectedVerse(verse);
    setLastPosition(null);
    setChoosingVerse(false);
  }

  return <StudySheet title={activeWord ? 'Detalle de palabra' : choosingVerse ? 'Elegir versículo' : 'Interlineal'}
    reference={choosingVerse ? reference : verseReference} palette={palette} onClose={onClose}
    backLabel="Volver" onBack={activeWord ? () => setActiveWord(null) : choosingVerse ? () => setChoosingVerse(false) : undefined}
    footer={showReading && numbers.length ? <StudyVerseNavigation verse={selectedVerse} numbers={numbers} onChange={changeVerse}
      onChoose={() => setChoosingVerse(true)} palette={palette} /> : undefined}>
    {activeWord ? <InterlinearWordDetails key={`${activeWord.verse}:${activeWord.position}`} word={activeWord}
      palette={palette} fontSize={fontSize} onBack={() => setActiveWord(null)} /> : null}
    {choosingVerse ? <StudyVersePicker verse={selectedVerse} numbers={numbers} palette={palette} onChange={changeVerse} /> : null}
    <FlatList key={selectedVerse} style={{ display: showReading ? 'flex' : 'none', flex: 1 }}
      accessibilityElementsHidden={!showReading} importantForAccessibility={showReading ? 'auto' : 'no-hide-descendants'}
      data={words} keyExtractor={(word) => String(word.position)} extraData={lastPosition}
      initialNumToRender={8} windowSize={5} contentContainerStyle={studyStyles.content}
      ListHeaderComponent={<View style={{ gap: 20 }}>
        <StudyPassageQuote reference={verseReference} text={text} bibleAbbr={bibleAbbr} palette={palette} fontSize={fontSize} />
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>Palabra por palabra</Text>
          <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 22 }}>
            {language} original{words.length ? ` · ${words.length} palabras` : ''}. Sigue el orden de arriba abajo y toca una palabra para conocer su significado.
          </Text>
          {englishGlosses ? <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 21 }}>
            Los significados breves de esta fuente están en inglés. Abre una palabra para consultar el diccionario Strong.
          </Text> : null}
        </View>
        {loading || error ? <StudyFeedback {...feedback} /> : null}
      </View>}
      ListEmptyComponent={!loading && !error ? <View style={[studyStyles.card, { borderColor: palette.border, backgroundColor: palette.card }]}>
        <Text style={{ color: palette.text, fontSize: 17, fontWeight: '700' }}>Este versículo aún no tiene interlineal</Text>
        <Text style={{ color: palette.muted, fontSize: 15, lineHeight: 24 }}>Puedes consultar otro versículo con los controles de abajo.</Text>
      </View> : null}
      renderItem={({ item }) => <InterlinearWordRow word={item} selected={item.position === lastPosition} palette={palette}
        onPress={() => { setLastPosition(item.position); setActiveWord(item); }} />}
      ListFooterComponent={<StudyFooter palette={palette} onClose={onClose} source="STEPBible.org · Tyndale House Cambridge · CC BY 4.0">
        {!loading && !error ? <StudyFeedback {...feedback} /> : null}
      </StudyFooter>} />
  </StudySheet>;
}

const InterlinearWordRow = memo(function InterlinearWordRow({ word, selected, palette, onPress }: {
  word: InterlinearWord; selected: boolean; palette: StudyPalette; onPress: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const gloss = word.glossEs || word.glossEn || 'Consultar significado';
  const original = readableOriginal(word.original);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }}
    accessibilityLabel={`Palabra ${word.position}: ${original}. ${gloss}`}
    accessibilityHint="Abre su significado y la definición del diccionario Strong."
    onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 16, minHeight: 96, borderRadius: 16, borderWidth: 1,
      borderColor: selected ? palette.accent : palette.border, backgroundColor: selected ? palette.accentSoft : palette.card,
      opacity: pressed ? 0.65 : 1 })}>
    <Text style={{ color: palette.muted, fontSize: 12, minWidth: 16, textAlign: 'center' }}>{word.position}</Text>
    <View style={{ flex: 1, minWidth: 0, flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', gap: 12 }}>
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 4 }}>
        <Text style={{ color: palette.text, fontFamily: studyReadingFont, fontSize: 26, lineHeight: 42,
          writingDirection: word.language === 'grc' ? 'ltr' : 'rtl', textAlign: 'left' }}>{original}</Text>
        {word.transliteration ? <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>{word.transliteration}</Text> : null}
      </View>
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 4 }}>
        <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>{word.glossEs ? 'Significado' : word.glossEn ? 'En inglés' : 'Diccionario'}</Text>
        <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{gloss}</Text>
      </View>
    </View>
    <AppIcon name="chevron-right" color={palette.muted} size={18} />
  </Pressable>;
});
