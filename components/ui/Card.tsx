import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
  dashed?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, muted, dashed, onPress }: CardProps) {
  const { colors, radius, shadow } = useAppTheme();
  const inner = (
    <View
      style={[
        styles.card,
        shadow.sm,
        {
          backgroundColor: muted ? colors.cardMuted : colors.card,
          borderColor: dashed ? colors.border : colors.border,
          borderRadius: radius.xl,
          borderStyle: dashed ? 'dashed' : 'solid',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
  },
});
