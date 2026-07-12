import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNetwork } from '@/context/NetworkContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as repo from '@/lib/repo';

/** Muestra cuantas notas/libretas locales aun no se sincronizan con el servidor. */
export function SyncStatusBadge() {
  const { colors } = useAppTheme();
  const { isOnline } = useNetwork();
  const [pending, setPending] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      repo
        .repoCountPendingSync()
        .then((count) => {
          if (active) setPending(count);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  if (pending === 0) return null;

  return (
    <View style={[styles.badge, { backgroundColor: isOnline ? colors.primarySoft : '#F59E0B18' }]}>
      <SymbolView
        name={{ ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' }}
        tintColor={isOnline ? colors.primary : '#B45309'}
        size={13}
      />
      <Text style={{ color: isOnline ? colors.primary : '#B45309', fontSize: 11, fontWeight: '700' }}>
        {pending} por sincronizar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
});
