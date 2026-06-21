import { ScrollView, StyleSheet, Text } from 'react-native';

import { HighlightsPanel } from '@/components/HighlightsPanel';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function HighlightsScreen() {
  const { colors, typography } = useAppTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.screen}>
      <Text style={[typography.h1, { color: colors.text }]}>Mis subrayados</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Organiza tus versículos subrayados por color
      </Text>
      <HighlightsPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 32, gap: 12 },
  sub: { fontSize: 14, marginBottom: 4 },
});
