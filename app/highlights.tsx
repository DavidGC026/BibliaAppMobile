import { ScrollView, StyleSheet, Text } from 'react-native';

import { HighlightsPanel } from '@/components/HighlightsPanel';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';

export default function HighlightsScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.screen, { paddingBottom: contentPadding }]}
    >
      <Text style={[typography.h1, { color: colors.text }]}>Mis subrayados</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Organiza tus versículos subrayados por color
      </Text>
      <HighlightsPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  sub: { fontSize: 14, marginBottom: 4 },
});
