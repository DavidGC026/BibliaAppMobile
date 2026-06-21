import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatisticsPanel } from '@/components/StatisticsPanel';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function StatisticsScreen() {
  const { colors, typography } = useAppTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[typography.h1, { color: colors.text }]}>Estadísticas</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Análisis de tu progreso de lectura bíblica
      </Text>
      <StatisticsPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  sub: { fontSize: 14, marginBottom: 4 },
});
