import { StyleSheet, Text, View } from 'react-native';

import { THEME_BADGE, THEME_BADGE_DARK } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

interface BadgeProps {
  label: string;
  themeKey?: string;
}

export function Badge({ label, themeKey }: BadgeProps) {
  const { isDark } = useAppTheme();
  const map = isDark ? THEME_BADGE_DARK : THEME_BADGE;
  const preset = themeKey ? map[themeKey] : null;
  const bg = preset?.bg ?? (isDark ? '#422006' : '#FEF3C7');
  const text = preset?.text ?? (isDark ? '#E8B84A' : '#92700C');
  const border = preset?.border ?? (isDark ? '#78350F' : '#FDE68A');

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
