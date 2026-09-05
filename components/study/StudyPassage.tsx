import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AppIcon } from '@/components/ui/AppIcon';
import { studyVerseLabel } from '@/lib/studyPresentation';
import { studyReadingFont, studyStyles, type StudyPalette } from './StudySheet';

export function StudyPassageQuote({ reference, text, bibleAbbr, palette, fontSize = 19 }: {
  reference: string; text?: string; bibleAbbr?: string; palette: StudyPalette; fontSize?: number;
}) {
  if (!text) return null;
  return <View style={{ borderLeftWidth: 3, borderColor: palette.accent, paddingLeft: 16, gap: 8 }}>
    <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20, fontWeight: '600' }}>{reference}{bibleAbbr ? ` · ${bibleAbbr}` : ''}</Text>
    <Text selectable style={{ color: palette.text, fontFamily: studyReadingFont, fontSize, lineHeight: Math.round(fontSize * 1.65) }}>{text}</Text>
  </View>;
}

export function StudyVerseNavigation({ verse, numbers, onChange, onChoose, palette }: {
  verse: number; numbers: number[]; onChange: (verse: number) => void; onChoose: () => void; palette: StudyPalette;
}) {
  const index = numbers.indexOf(verse);
  return <View style={[studyStyles.row, { flexWrap: 'nowrap', padding: 8, maxWidth: 760, width: '100%', alignSelf: 'center' }]}>
    {(['previous', 'choose', 'next'] as const).map((action) => {
      if (action === 'choose') return <Pressable key={action} accessibilityRole="button"
        accessibilityLabel={`Elegir versículo. Actual: ${studyVerseLabel(verse)}`} onPress={onChoose}
        style={({ pressed }) => ({ flex: 1, minHeight: 56, padding: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>Cambiar versículo</Text>
        <View style={[studyStyles.row, { justifyContent: 'center' }]}>
          <Text style={{ color: palette.text, fontSize: 16, lineHeight: 24, fontWeight: '700' }}>{studyVerseLabel(verse)}</Text>
          <AppIcon name="chevron-down" color={palette.text} size={16} />
        </View>
      </Pressable>;
      const destination = numbers[index + (action === 'previous' ? -1 : 1)];
      const disabled = index < 0 || destination === undefined;
      return <Pressable key={action} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
        accessibilityLabel={action === 'previous' ? 'Versículo anterior' : 'Versículo siguiente'}
        onPress={() => { if (destination !== undefined) onChange(destination); }}
        style={({ pressed }) => ({ minWidth: 56, minHeight: 56, borderRadius: 16, backgroundColor: palette.card,
          alignItems: 'center', justifyContent: 'center', opacity: disabled || pressed ? 0.4 : 1 })}>
        <AppIcon name={action === 'previous' ? 'chevron-left' : 'chevron-right'} color={palette.text} size={22} />
      </Pressable>;
    })}
  </View>;
}

export function StudyVersePicker({ verse, numbers, palette, onChange }: {
  verse: number; numbers: number[]; palette: StudyPalette; onChange: (verse: number) => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.3 ? 3 : width > 600 ? 8 : 5;
  return <FlatList key={columns} data={numbers} numColumns={columns} keyExtractor={String}
    contentContainerStyle={studyStyles.content} columnWrapperStyle={{ gap: 8 }}
    ListHeaderComponent={<Text style={{ color: palette.muted, fontSize: 16, lineHeight: 25 }}>Elige el versículo que quieres estudiar.</Text>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={studyVerseLabel(item)}
      accessibilityState={{ selected: item === verse }} onPress={() => onChange(item)}
      style={({ pressed }) => ({ flex: 1, minHeight: 56, padding: 8, justifyContent: 'center', alignItems: 'center',
        borderRadius: 12, borderWidth: 1, borderColor: item === verse ? palette.accent : palette.border,
        backgroundColor: item === verse ? palette.accentSoft : palette.card, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: item === verse ? '800' : '500' }}>{item === 0 ? 'Título' : item}</Text>
    </Pressable>} />;
}
