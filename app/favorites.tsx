import { ScrollView, StyleSheet, Text } from 'react-native';

import { FavoritesPanel } from '@/components/FavoritesPanel';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function FavoritesScreen() {
  const { colors, typography } = useAppTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.screen}>
      <Text style={[typography.h1, { color: colors.text }]}>Favoritos</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>Tus versículos bíblicos guardados</Text>
      <FavoritesPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 32, gap: 12 },
  sub: { fontSize: 14, marginBottom: 4 },
});
