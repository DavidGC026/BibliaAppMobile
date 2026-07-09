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
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import {
  deleteCrossReferences,
  deleteDictionary,
  deleteDownloadedBible,
  downloadBible,
  downloadCrossReferences,
  downloadDictionary,
  getCrossRefsDownloadInfo,
  getDictionaryDownloadInfo,
  getDownloadedSize,
  listLocalBibles,
  type DownloadProgress,
  type StudyDownloadProgress,
} from '@/lib/repo';
import type { BibleVersion } from '@/lib/types';

type StudyKey = 'dictionary' | 'references';

const STUDY_ITEMS: { key: StudyKey; title: string; subtitle: string; unit: string }[] = [
  {
    key: 'dictionary',
    title: 'Diccionario Strong',
    subtitle: 'Léxico griego y hebreo con definiciones en español',
    unit: 'entradas',
  },
  {
    key: 'references',
    title: 'Referencias cruzadas',
    subtitle: 'Conexiones entre versículos de toda la Biblia',
    unit: 'referencias',
  },
];

type StudyStatus = (typeof STUDY_ITEMS)[number] & {
  downloaded: boolean;
  total: number;
  downloading: boolean;
  progress?: StudyDownloadProgress;
};

type BibleStatus = BibleVersion & {
  downloaded: boolean;
  verseCount: number;
  downloading: boolean;
  progress?: DownloadProgress;
};

export default function DownloadsScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const [items, setItems] = useState<BibleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [study, setStudy] = useState<StudyStatus[]>(() =>
    STUDY_ITEMS.map((s) => ({ ...s, downloaded: false, total: 0, downloading: false })),
  );

  const loadStudy = useCallback(async () => {
    const [dictInfo, refsInfo] = await Promise.all([
      getDictionaryDownloadInfo(),
      getCrossRefsDownloadInfo(),
    ]);
    setStudy((prev) =>
      prev.map((s) => {
        const info = s.key === 'dictionary' ? dictInfo : refsInfo;
        return { ...s, downloaded: info !== null, total: info?.total ?? 0, downloading: false };
      }),
    );
  }, []);

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
    loadStudy();
  }, [load, loadStudy]);

  const startStudyDownload = async (key: StudyKey) => {
    setStudy((prev) =>
      prev.map((s) => (s.key === key ? { ...s, downloading: true, progress: undefined } : s)),
    );
    const onProgress = (p: StudyDownloadProgress) => {
      setStudy((prev) => prev.map((s) => (s.key === key ? { ...s, progress: p } : s)));
    };
    try {
      if (key === 'dictionary') await downloadDictionary('strong', onProgress);
      else await downloadCrossReferences(onProgress);
      await loadStudy();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo descargar');
      setStudy((prev) => prev.map((s) => (s.key === key ? { ...s, downloading: false } : s)));
    }
  };

  const removeStudyDownload = (key: StudyKey, name: string) => {
    Alert.alert('Eliminar descarga', `¿Quitar "${name}" del dispositivo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          if (key === 'dictionary') await deleteDictionary('strong');
          else await deleteCrossReferences();
          await loadStudy();
        },
      },
    ]);
  };

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
    >
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

      <Text style={[typography.h2, { color: colors.text, marginTop: 16 }]}>Contenido de estudio</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
        Descarga el diccionario y las referencias cruzadas para estudiar sin conexión.
      </Text>
      {study.map((s) => (
        <Card key={s.key} style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{s.title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{s.subtitle}</Text>
              {s.downloaded ? (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                  Descargado · {s.total.toLocaleString()} {s.unit}
                </Text>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>No descargado</Text>
              )}
              {s.downloading && s.progress ? (
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  Descargando ({s.progress.current}/{s.progress.total})
                </Text>
              ) : null}
            </View>
            {s.downloading ? (
              <ActivityIndicator color={colors.primary} />
            ) : s.downloaded ? (
              <Button label="Eliminar" variant="outline" onPress={() => removeStudyDownload(s.key, s.title)} />
            ) : (
              <Button label="Descargar" onPress={() => startStudyDownload(s.key)} />
            )}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
