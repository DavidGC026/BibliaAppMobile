import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import {
  deleteDownloadedBible,
  downloadBible,
  getDownloadedSize,
  listLocalBibles,
  type DownloadProgress,
} from '@/lib/repo';
import type { BibleVersion } from '@/lib/types';

type BibleStatus = BibleVersion & {
  downloaded: boolean;
  verseCount: number;
  downloading: boolean;
  progress?: DownloadProgress;
};

export default function DownloadsScreen() {
  const { colors, typography } = useAppTheme();
  const [items, setItems] = useState<BibleStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { bibles } = await api.listBibles();
      const local = await listLocalBibles();
      const localMap = new Map(local.map((b) => [b.bibleId, b]));
      const merged: BibleStatus[] = await Promise.all(
        bibles.map(async (b) => {
          const loc = localMap.get(b.bibleId);
          const verseCount = loc?.downloaded ? await getDownloadedSize(b.bibleId) : 0;
          return {
            ...b,
            downloaded: loc?.downloaded ?? false,
            verseCount,
            downloading: false,
          };
        }),
      );
      setItems(merged);
    } catch {
      const local = await listLocalBibles();
      setItems(
        local.map((b) => ({
          bibleId: b.bibleId,
          abbr: b.abbr,
          name: b.name,
          downloaded: b.downloaded,
          verseCount: 0,
          downloading: false,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startDownload = async (bibleId: number) => {
    setItems((prev) =>
      prev.map((b) => (b.bibleId === bibleId ? { ...b, downloading: true, progress: undefined } : b)),
    );
    try {
      await downloadBible(bibleId, (p) => {
        setItems((prev) =>
          prev.map((b) => (b.bibleId === bibleId ? { ...b, progress: p } : b)),
        );
      });
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo descargar');
      setItems((prev) =>
        prev.map((b) => (b.bibleId === bibleId ? { ...b, downloading: false } : b)),
      );
    }
  };

  const removeDownload = (bibleId: number, name: string) => {
    Alert.alert('Eliminar descarga', `¿Quitar "${name}" del dispositivo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteDownloadedBible(bibleId);
          await load();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <OfflineBanner />
      <Text style={[typography.h1, { color: colors.text }]}>Descargas</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
        Descarga una versión completa de la Biblia para leer sin conexión a internet.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        items.map((b) => (
          <Card key={b.bibleId} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{b.abbr}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{b.name}</Text>
                {b.downloaded ? (
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                    Descargada · {b.verseCount.toLocaleString()} versículos
                  </Text>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>No descargada</Text>
                )}
                {b.downloading && b.progress ? (
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    {b.progress.phase} ({b.progress.current}/{b.progress.total})
                  </Text>
                ) : null}
              </View>
              {b.downloading ? (
                <ActivityIndicator color={colors.primary} />
              ) : b.downloaded ? (
                <Button label="Eliminar" variant="outline" onPress={() => removeDownload(b.bibleId, b.abbr)} />
              ) : (
                <Button label="Descargar" onPress={() => startDownload(b.bibleId)} />
              )}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
