import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppIcon } from '@/components/ui/AppIcon';
import type { PassageReference } from '@/lib/games/content';

export type OpenPassage = (passage: PassageReference, bibleId?: number) => void;

export function GameButton({ label, onPress, secondary, disabled, selected, expanded }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; selected?: boolean; expanded?: boolean }) {
  const { colors } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled, ...(selected === undefined ? {} : { selected }), ...(expanded === undefined ? {} : { expanded }) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: secondary ? colors.card : colors.primary, borderColor: selected ? colors.primary : colors.border, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
    <Text style={{ color: secondary ? colors.text : colors.primaryForeground, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
  </Pressable>;
}

export function GameCard({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

export function GameText({ children, heading, muted }: { children: ReactNode; heading?: boolean; muted?: boolean }) {
  const { colors } = useAppTheme();
  return <Text accessibilityRole={heading ? 'header' : undefined} style={{ color: muted ? colors.textMuted : colors.text, fontSize: heading ? 21 : 16, lineHeight: heading ? 29 : 24, fontWeight: heading ? '700' : '400' }}>{children}</Text>;
}

export function LiveMessage({ text }: { text: string }) {
  const { colors } = useAppTheme();
  useEffect(() => { if (text && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text); }, [text]);
  return <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>{text}</Text>;
}

export function GameResultPanel({ title, score, children, onRestart }: { title: string; score: number; children?: ReactNode; onRestart: () => void }) {
  const { colors } = useAppTheme();
  return <GameCard>
    <AppIcon name="trophy" color={colors.primary} size={32} />
    <GameText heading>{title}</GameText><LiveMessage text={`${score} de 100 puntos`} />
    {children}<GameButton label="Jugar otra vez" onPress={onRestart} />
  </GameCard>;
}

export function PassageButton({ passage, bibleId, onOpen }: { passage: PassageReference; bibleId?: number; onOpen: OpenPassage }) {
  return <GameButton secondary label={`Leer ${passage.reference}`} onPress={() => onOpen(passage, bibleId)} />;
}

export const GAME_LETTER_COLORS = { correct: '#15803D', present: '#A16207' };
export const LETTER_SYMBOLS = { correct: '●', present: '↔', absent: '×' };

export const styles = StyleSheet.create({
  column: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 16 },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 10, minHeight: 52, padding: 12, fontSize: 18 },
  verse: { fontSize: 25, lineHeight: 39, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
});
