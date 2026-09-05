import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { parseDictionaryDefinition } from '@/lib/dictionary';
import { readableOriginal } from '@/lib/studyPresentation';
import type { InterlinearWord } from '@/lib/study';
import { StudyButton, studyReadingFont, studyStyles, type StudyPalette } from './StudySheet';

export function InterlinearWordDetails({ word, palette, fontSize, onBack }: {
  word: InterlinearWord; palette: StudyPalette; fontSize: number; onBack: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sections = word.definition ? parseDictionaryDefinition(word.definition) : [];
  const definition = sections.filter((section) => section.label === 'Definición' || !section.label);
  const additional = sections.filter((section) => section.label && section.label !== 'Definición');
  const gloss = word.glossEs || word.glossEn;
  const englishGloss = !word.glossEs && Boolean(word.glossEn);

  return <ScrollView contentContainerStyle={studyStyles.content}>
    <View style={{ paddingVertical: 12, gap: 8 }}>
      <Text style={{ color: palette.muted, fontSize: 13, fontWeight: '600' }}>Palabra del versículo</Text>
      <Text selectable style={{ color: palette.text, fontFamily: studyReadingFont, fontSize: 36, lineHeight: 58,
        textAlign: 'center', writingDirection: word.language === 'grc' ? 'ltr' : 'rtl' }}>{readableOriginal(word.original)}</Text>
      {word.transliteration ? <Text style={{ color: palette.muted, fontSize: 17, lineHeight: 26, textAlign: 'center' }}>{word.transliteration}</Text> : null}
      {gloss ? <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ color: palette.muted, fontSize: 13 }}>{englishGloss ? 'Significado breve en inglés' : 'Significado breve'}</Text>
        <Text selectable style={{ color: palette.text, fontSize: 22, lineHeight: 32, fontWeight: '700', textAlign: 'center' }}>{gloss}</Text>
      </View> : null}
    </View>
    <View style={{ borderTopWidth: 1, borderColor: palette.border, paddingTop: 24, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>Diccionario Strong</Text>
      {word.strongCode ? <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 22 }}>
        {word.strongCode} es el código de esta palabra en el diccionario.
      </Text> : null}
      {definition.length ? definition.map((section, index) => <Text key={index} selectable
        style={{ color: palette.text, fontSize, lineHeight: Math.round(fontSize * 1.65) }}>{section.text}</Text>) : (
        <Text style={{ color: palette.muted, fontSize: 16, lineHeight: 25 }}>Esta forma no tiene una definición disponible en el diccionario.</Text>
      )}
    </View>
    <StudyButton label={detailsOpen ? 'Ocultar detalles lingüísticos' : 'Ver detalles lingüísticos'}
      icon={detailsOpen ? 'chevron-up' : 'chevron-down'} expanded={detailsOpen}
      onPress={() => setDetailsOpen((open) => !open)} palette={palette} />
    {detailsOpen ? <View style={[studyStyles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {word.lemma ? <View style={{ gap: 4 }}>
        <Text style={{ color: palette.muted, fontSize: 13 }}>Forma base del diccionario</Text>
        <Text selectable style={{ color: palette.text, fontSize: 26, lineHeight: 42,
          writingDirection: word.language === 'grc' ? 'ltr' : 'rtl' }}>{word.lemma}</Text>
      </View> : null}
      {word.transliteration ? <Text selectable style={{ color: palette.text, fontSize: 15, lineHeight: 24 }}>Transliteración (letras latinas): {word.transliteration}</Text> : null}
      {word.morph ? <Text selectable style={{ color: palette.text, fontSize: 15, lineHeight: 24 }}>Código gramatical de la fuente: {word.morph}</Text> : null}
      {word.original.includes('/') ? <Text selectable style={{ color: palette.muted, fontSize: 15, lineHeight: 25 }}>Forma segmentada de la fuente: {word.original}</Text> : null}
      {additional.map((section, index) => <View key={index} style={{ gap: 6 }}>
        <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{section.label}</Text>
        <Text selectable style={{ color: palette.text, fontSize: fontSize - 1, lineHeight: Math.round(fontSize * 1.6) }}>{section.text}</Text>
      </View>)}
    </View> : null}
    <StudyButton label="Volver a las palabras" icon="arrow-left" onPress={onBack} palette={palette} />
  </ScrollView>;
}
