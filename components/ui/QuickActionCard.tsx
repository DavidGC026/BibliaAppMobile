import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';

interface QuickActionCardProps {
  icon: SymbolViewProps['name'];
  title: string;
  description: string;
  onPress: () => void;
  locked?: boolean;
}

export function QuickActionCard({ icon, title, description, onPress, locked }: QuickActionCardProps) {
  const { colors } = useAppTheme();

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <SymbolView name={icon} tintColor={colors.primary} size={22} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
            {locked ? ' 🔒' : ''}
          </Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 18 },
});
