import { useThemeMode } from '@/context/ThemeContext';

export const useColorScheme = () => useThemeMode().scheme;
