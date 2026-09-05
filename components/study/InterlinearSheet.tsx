import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useChapterStudy } from '@/hooks/useChapterStudy';
import { parseDictionaryDefinition } from '@/lib/dictionary';
import { groupInterlinearWords, interlinearApplies, interlinearLanguageLabel, type InterlinearPreference, type InterlinearWord, type StudyPassage } from '@/lib/study';
import type { Verse } from '@/lib/types';
import { StudyButton, StudyFeedback, StudySheet, studyStyles, type StudyPalette } from './StudySheet';

export function InterlinearSheet({ passage, bookName, verses, initialVerse, preference, onPreferenceChange, palette, onClose }: {
  passage: StudyPassage; bookName: string; verses: Verse[]; initialVerse: number | null;
  preference: InterlinearPreference; onPreferenceChange: (value: InterlinearPreference) => void;
  palette: StudyPalette; onClose: () => void;
}) {
  const [verseFilter, setVerseFilter] = useState(initialVerse);
  const applies = interlinearApplies(preference, passage.bookId);
  const { result, loading, error, retry } = useChapterStudy('interlinear', passage, applies);
  const groups = useMemo(() => [...groupInterlinearWords(result?.content ?? [])]
    .filter(([verse]) => verseFilter === null || verse === verseFilter), [result?.content, verseFilter]);
  const translation = useMemo(() => new Map(verses.map((verse) => [verse.verse, verse.text])), [verses]);
  const reference = `${bookName} ${passage.chapter}`;

  return (
    <StudySheet title="Interlineal" reference={reference} palette={palette} onClose={onClose}>
      <FlatList data={applies ? groups : []} keyExtractor={([verse]) => String(verse)}
        initialNumToRender={6} windowSize={5} contentContainerStyle={studyStyles.content}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View style={studyStyles.row}>
              {([['auto', 'Auto'], ['heb', 'Hebreo'], ['grc', 'Griego']] as const).map(([value, label]) => (
                <StudyButton key={value} label={label} selected={preference === value} onPress={() => onPreferenceChange(value)} palette={palette} />
              ))}
            </View>
            <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 21 }}>
              {passage.bookId <= 39
                ? 'Original hebreo y arameo con glosa en inglés. Toca una palabra para consultar su definición Strong en español.'
                : 'Original griego con glosa en español. Toca una palabra para consultar su definición Strong.'}
            </Text>
            {initialVerse !== null ? (
              <View style={studyStyles.row}>
                <StudyButton label={`Versículo ${initialVerse}`} selected={verseFilter !== null} onPress={() => setVerseFilter(initialVerse)} palette={palette} />
                <StudyButton label="Todo el capítulo" selected={verseFilter === null} onPress={() => setVerseFilter(null)} palette={palette} />
              </View>
            ) : null}
            {applies ? <StudyFeedback loading={loading} error={error} offlineAvailable={result?.offlineAvailable} palette={palette} onRetry={retry} /> : (
              <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>
                Este libro tiene original {passage.bookId <= 39 ? 'hebreo / arameo' : 'griego'}. Selecciona Auto para consultarlo.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={applies && !loading && !error ? (
          <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 24 }}>No hay interlineal publicado para este pasaje.</Text>
        ) : null}
        renderItem={({ item: [verse, words] }) => (
          <InterlinearVerse words={words} label={verse === 0 ? 'Título' : `${reference}:${verse}`}
            text={translation.get(verse)} palette={palette} initiallyOpen={verse === (initialVerse ?? 1)} />
        )}
        ListFooterComponent={
          <View style={{ marginTop: 16, gap: 12 }}>
            <StudyButton label="Gestionar descargas" palette={palette} onPress={() => { onClose(); router.push('/downloads'); }} />
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>Datos de STEPBible.org · Tyndale House Cambridge · CC BY 4.0.</Text>
            <StudyButton label="Fuentes y atribuciones" palette={palette} onPress={() => { onClose(); router.push('/legal'); }} />
          </View>
        }
      />
    </StudySheet>
  );
}

const InterlinearVerse = memo(function InterlinearVerse({ words, label, text, palette, initiallyOpen }: {
  words: InterlinearWord[]; label: string; text?: string; palette: StudyPalette; initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const active = words.find((word) => word.position === activePosition);
  const rtl = words.some((word) => word.language !== 'grc');
  const sections = active?.definition ? parseDictionaryDefinition(active.definition) : [];

  return (
    <View style={[studyStyles.card, { borderColor: palette.border, backgroundColor: palette.card }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${open ? 'Plegar' : 'Abrir'} interlineal de ${label}`}
        accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16 }}>{label}</Text>
        <Text style={{ color: palette.muted, fontSize: 13 }}>{interlinearLanguageLabel(words)} · {words.length} palabras · {open ? 'Plegar' : 'Abrir'}</Text>
      </Pressable>
      {open ? (
        <>
          {text ? <Text selectable style={{ color: palette.text, fontSize: 16, lineHeight: 25 }}>{text}</Text> : null}
          <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', direction: 'ltr', flexWrap: 'wrap', gap: 8 }}>
            {words.map((word) => (
              <Pressable key={word.position} accessibilityRole="button"
                accessibilityLabel={`${word.original}, ${word.glossEs || word.glossEn || ''}, ${word.strongCode || 'sin código Strong'}`}
                accessibilityState={{ selected: word.position === activePosition }}
                onPress={() => setActivePosition(word.position === activePosition ? null : word.position)}
                style={({ pressed }) => ({ minHeight: 48, minWidth: 72, maxWidth: '100%', padding: 12, borderWidth: 1, borderRadius: 12,
                  borderColor: word.position === activePosition ? palette.accent : palette.border,
                  backgroundColor: word.position === activePosition ? palette.accentSoft : palette.background, opacity: pressed ? 0.6 : 1, gap: 4 })}>
                <Text style={{ color: palette.text, fontSize: 24, lineHeight: 38, textAlign: 'center', writingDirection: word.language === 'grc' ? 'ltr' : 'rtl' }}>{word.original}</Text>
                {word.transliteration ? <Text style={{ color: palette.muted, fontSize: 13, textAlign: 'center' }}>{word.transliteration}</Text> : null}
                <Text style={{ color: palette.text, fontSize: 14, textAlign: 'center' }}>{word.glossEs || word.glossEn || '—'}</Text>
                {word.strongCode ? <Text style={{ color: palette.muted, fontSize: 12, textAlign: 'center' }}>{word.strongCode}</Text> : null}
              </Pressable>
            ))}
          </View>
          {active ? (
            <View style={{ borderTopWidth: 1, borderColor: palette.border, paddingTop: 16, gap: 12 }}>
              <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{active.strongCode || 'Forma original'}{active.lemma ? ` · ${active.lemma}` : ''}</Text>
              {active.morph ? <Text style={{ color: palette.muted, fontSize: 13 }}>Morfología: {active.morph}</Text> : null}
              {sections.length ? sections.map((section, index) => (
                <Text key={index} selectable style={{ color: palette.text, fontSize: 16, lineHeight: 25 }}>
                  {section.label ? <Text style={{ fontWeight: '700' }}>{section.label}. </Text> : null}{section.text}
                </Text>
              )) : <Text style={{ color: palette.muted, fontSize: 16 }}>Sin definición Strong para esta forma.</Text>}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
});
