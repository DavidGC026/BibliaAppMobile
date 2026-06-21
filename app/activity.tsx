import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActivityPanel } from '@/components/ActivityPanel';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function ActivityScreen() {
  const { colors, typography } = useAppTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[typography.h1, { color: colors.text }]}>Actividad</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Actividad reciente y progreso de lectura
      </Text>
      <ActivityPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  sub: { fontSize: 14, marginBottom: 4 },
});
