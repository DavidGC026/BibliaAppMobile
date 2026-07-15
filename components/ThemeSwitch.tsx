import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import Colors from '@/constants/Colors';
import {
  useThemeMode,
  type ResolvedScheme,
  type ThemeMode,
} from '@/context/ThemeContext';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ThemeOption {
  key: ThemeMode;
  label: string;
  description: string;
  scheme?: ResolvedScheme;
  adminOnly?: boolean;
}

const OPTIONS: ThemeOption[] = [
  { key: 'system', label: 'Sistema', description: 'Se adapta al dispositivo' },
  { key: 'light', label: 'Claro', description: 'Limpio y luminoso', scheme: 'light' },
  { key: 'dark', label: 'Oscuro', description: 'Cómodo por la noche', scheme: 'dark' },
  { key: 'sepia', label: 'Sepia', description: 'Lectura cálida', scheme: 'sepia' },
  {
    key: 'sepiaDark',
    label: 'Sepia oscuro',
    description: 'Cálido y tenue',
    scheme: 'sepiaDark',
  },
  { key: 'midnight', label: 'Medianoche', description: 'Azul profundo', scheme: 'midnight' },
  { key: 'forest', label: 'Bosque', description: 'Verde sereno', scheme: 'forest' },
  { key: 'lavender', label: 'Lavanda', description: 'Suave y elegante', scheme: 'lavender' },
  {
    key: 'dvg',
    label: 'DVG',
    description: 'Edición administrativa',
    scheme: 'dvg',
    adminOnly: true,
  },
];

export function ThemeSwitch({ isAdmin = false }: { isAdmin?: boolean }) {
  const { mode, systemScheme, setMode } = useThemeMode();
  const { colors, radius } = useAppTheme();
  const visibleOptions = OPTIONS.filter((option) => !option.adminOnly || isAdmin);

  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>Apariencia</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Elige el ambiente de la aplicación.</Text>
      </View>

      <View style={styles.grid}>
        {visibleOptions.map((option) => {
          const active = mode === option.key;
          const preview = Colors[option.scheme ?? systemScheme];

          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`Tema ${option.label}. ${option.description}`}
              style={({ pressed }) => [
                styles.option,
                {
                  borderRadius: radius.lg,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primarySoft : colors.cardMuted,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
              onPress={() => setMode(option.key)}
            >
              <View
                style={[
                  styles.preview,
                  { backgroundColor: preview.background, borderColor: preview.border },
                ]}
              >
                <View style={[styles.previewCard, { backgroundColor: preview.card }]}>
                  <View style={[styles.previewLine, { backgroundColor: preview.text }]} />
                  <View style={[styles.previewLineShort, { backgroundColor: preview.textMuted }]} />
                </View>
                <View style={[styles.previewAccent, { backgroundColor: preview.primary }]} />
              </View>

              <View style={styles.optionCopy}>
                <View style={styles.labelRow}>
                  <Text
                    numberOfLines={1}
                    style={[styles.optionLabel, { color: active ? colors.primary : colors.text }]}
                  >
                    {option.label}
                  </Text>
                  {option.adminOnly ? (
                    <View style={[styles.adminBadge, { backgroundColor: preview.primary }]}>
                      <Text style={[styles.adminBadgeText, { color: preview.primaryForeground }]}>ADMIN</Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={[styles.description, { color: colors.textMuted }]}>
                  {option.description}
                </Text>
              </View>

              <View
                style={[
                  styles.selection,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : 'transparent',
                  },
                ]}
              >
                {active ? <View style={[styles.selectionDot, { backgroundColor: colors.primaryForeground }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  heading: { gap: 3 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 138,
    borderWidth: 1.5,
    padding: 10,
    gap: 9,
    position: 'relative',
  },
  preview: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewCard: { width: '70%', borderRadius: 5, padding: 6, gap: 4 },
  previewLine: { width: '78%', height: 3, borderRadius: 2, opacity: 0.9 },
  previewLineShort: { width: '52%', height: 3, borderRadius: 2, opacity: 0.65 },
  previewAccent: {
    position: 'absolute',
    right: 9,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  optionCopy: { gap: 2, paddingRight: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  optionLabel: { fontWeight: '800', fontSize: 13, flexShrink: 1 },
  description: { fontSize: 11, lineHeight: 15 },
  adminBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  adminBadgeText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  selection: {
    position: 'absolute',
    right: 9,
    bottom: 10,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDot: { width: 5, height: 5, borderRadius: 3 },
});
