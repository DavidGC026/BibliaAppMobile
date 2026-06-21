import { StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';

interface StatCardProps {
  icon: SymbolViewProps['name'];
  value: string;
  label: string;
  onPress?: () => void;
}

export function StatCard({ icon, value, label, onPress }: StatCardProps) {
  const { colors } = useAppTheme();

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <SymbolView name={icon} tintColor={colors.primary} size={24} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
