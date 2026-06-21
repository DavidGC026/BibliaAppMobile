import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useThemeMode, type ThemeMode } from '@/context/ThemeContext';
import { useAppTheme } from '@/hooks/useAppTheme';

const OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'Sistema' },
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Oscuro' },
  { key: 'sepia', label: 'Sepia' },
];

export function ThemeSwitch() {
  const { mode, setMode } = useThemeMode();
  const { colors, radius } = useAppTheme();

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: colors.text }]}>Apariencia</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = mode === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.option,
                { borderRadius: radius.md, borderColor: colors.border },
                active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
              ]}
              onPress={() => setMode(opt.key)}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.textMuted,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
