import { Pressable, Text, View } from 'react-native';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import type { StudyPalette } from './StudySheet';
import { readableStudyPalette } from './studyPalette';

export function StudyEntryPoints({ hasInterlinear, disabled, palette: readerPalette, onInterlinear, onCommentaries }: {
  hasInterlinear: boolean; disabled: boolean; palette: StudyPalette; onInterlinear: () => void; onCommentaries: () => void;
}) {
  const palette = readableStudyPalette(readerPalette);
  const entries: { title: string; description: string; icon: AppIconName; onPress: () => void }[] = [
    ...(hasInterlinear ? [{ title: 'Interlineal', description: 'Palabra por palabra', icon: 'dictionary' as const, onPress: onInterlinear }] : []),
    { title: 'Comentarios', description: 'Explicación del pasaje', icon: 'notes', onPress: onCommentaries },
  ];
  return <View style={{ gap: 8, marginVertical: 16 }}>
    <Text style={{ color: palette.muted, fontSize: 13, fontWeight: '600' }}>Estudiar este pasaje</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {entries.map((entry) => <Pressable key={entry.title} accessibilityRole="button"
        accessibilityLabel={`${entry.title}. ${entry.description}`} accessibilityState={{ disabled }} disabled={disabled}
        onPress={entry.onPress} style={({ pressed }) => ({ flex: 1, flexBasis: 148, minHeight: 88, padding: 12,
          flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: palette.border,
          borderRadius: 14, backgroundColor: palette.card, opacity: pressed || disabled ? 0.6 : 1 })}>
        <AppIcon name={entry.icon} color={palette.text} size={22} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>{entry.title}</Text>
          <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>{entry.description}</Text>
        </View>
      </Pressable>)}
    </View>
  </View>;
}
