import { StyleSheet, Text, View } from 'react-native';

import { useNetwork } from '@/context/NetworkContext';
import { useAppTheme } from '@/hooks/useAppTheme';

export function OfflineBanner() {
  const { isOnline } = useNetwork();
  const { colors } = useAppTheme();

  if (isOnline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
        Sin conexión — usando contenido descargado
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
