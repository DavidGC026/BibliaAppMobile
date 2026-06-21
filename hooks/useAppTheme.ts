import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { radius, shadow, spacing, typography } from '@/constants/theme';

export function useThemeColors() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

export function useAppTheme() {
  const scheme = useColorScheme() ?? 'light';
  return {
    colors: Colors[scheme],
    isDark: scheme === 'dark',
    radius,
    shadow,
    spacing,
    typography,
  };
}
