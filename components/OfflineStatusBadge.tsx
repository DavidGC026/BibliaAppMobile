import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import {
  getOfflineDownloadSnapshot,
  subscribeOfflineDownloads,
  summarizeOfflineDownloads,
  type OfflineStatusSummary,
} from '@/lib/offlineDownloadManager';

export function OfflineStatusBadge({ compact = false }: { compact?: boolean }) {
  const { colors } = useAppTheme();
  const [summary, setSummary] = useState<OfflineStatusSummary>(() =>
    summarizeOfflineDownloads(getOfflineDownloadSnapshot()),
  );

  useEffect(() => {
    setSummary(summarizeOfflineDownloads(getOfflineDownloadSnapshot()));
    return subscribeOfflineDownloads((tasks) => setSummary(summarizeOfflineDownloads(tasks)));
  }, []);

  if (summary.status === 'idle' && summary.done === 0) return null;

  const tone =
    summary.status === 'error'
      ? { bg: '#EF444418', fg: colors.danger }
      : summary.status === 'syncing'
        ? { bg: colors.primarySoft, fg: colors.primary }
        : { bg: '#10B98118', fg: '#10B981' };

  const label =
    summary.status === 'error'
      ? `${summary.error} descarga${summary.error === 1 ? '' : 's'} fallida${summary.error === 1 ? '' : 's'}`
      : summary.status === 'syncing'
        ? `Descargando… ${summary.running + summary.queued} pendiente${summary.running + summary.queued === 1 ? '' : 's'}`
        : 'Contenido offline listo';

  return (
    <View style={[styles.badge, compact && styles.compact, { backgroundColor: tone.bg }]}>
      {summary.status === 'syncing' ? (
        <ActivityIndicator color={tone.fg} size="small" />
      ) : (
        <SymbolView
          name={
            summary.status === 'error'
              ? { ios: 'exclamationmark.triangle.fill', android: 'error', web: 'error' }
              : { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
          }
          tintColor={tone.fg}
          size={14}
        />
      )}
      <Text style={{ color: tone.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compact: { paddingHorizontal: 8, paddingVertical: 4 },
});
