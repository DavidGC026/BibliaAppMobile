import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  fullWidth,
}: ButtonProps) {
  const { colors, radius } = useAppTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        fullWidth && styles.full,
        {
          borderRadius: variant === 'primary' ? radius.full : radius.lg,
          backgroundColor: isPrimary ? colors.primary : 'transparent',
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: pressed || disabled || loading ? 0.85 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryForeground : colors.primary} />
      ) : (
        <Text
          style={{
            color: isPrimary ? colors.primaryForeground : variant === 'ghost' ? colors.primary : colors.text,
            fontWeight: '600',
            fontSize: 15,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { alignSelf: 'stretch' },
});
