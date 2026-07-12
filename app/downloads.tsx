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
  getCrossRefsDownloadInfo,
  getDictionaryDownloadInfo,
  getDownloadedSize,
  listLocalBibles,
  type DownloadProgress,
  type StudyDownloadProgress,
} from '@/lib/repo';
import {
  enqueueBibleDownload,
  enqueueStudyDownload,
  hydrateOfflineDownloads,
  subscribeOfflineDownloads,
  type OfflineDownloadTask,
} from '@/lib/offlineDownloadManager';
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
  const [tasks, setTasks] = useState<OfflineDownloadTask[]>([]);

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
    hydrateOfflineDownloads().catch(() => {});
    const unsubscribe = subscribeOfflineDownloads((next) => {
      setTasks(next);
      if (next.some((task) => task.status === 'done')) {
        load();
        loadStudy();
      }
    });
    load();
    loadStudy();
    return unsubscribe;
  }, [load, loadStudy]);

  const taskForBible = (bibleId: number) =>
    tasks.find((task) => task.kind === 'bible' && task.targetId === String(bibleId) && task.status !== 'done');

  const taskForStudy = (key: StudyKey) =>
    tasks.find((task) => task.kind === key && task.status !== 'done');

  const hasActiveDownloads = tasks.some((task) => task.status === 'queued' || task.status === 'running');

  const startStudyDownload = async (key: StudyKey) => {
    try {
      await enqueueStudyDownload(key);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo descargar');
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

  const startDownload = async (bible: BibleStatus) => {
    try {
      await enqueueBibleDownload(bible);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo descargar');
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
        Prepara tu Biblia, diccionario y referencias para estudiar sin conexión. Las descargas continúan aunque salgas de esta pantalla mientras la app siga abierta.
      </Text>

      <Card style={[styles.heroCard, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Modo offline</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          Descarga primero tu versión bíblica favorita. Para estudio profundo, agrega Strong y referencias cruzadas.
        </Text>
        {hasActiveDownloads ? (
          <View style={styles.activeBox}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>Descarga en segundo plano activa</Text>
          </View>
        ) : null}
      </Card>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        items.map((b) => {
          const task = taskForBible(b.bibleId);
          const progress = task?.progress ?? b.progress;
          const downloading = task?.status === 'running' || task?.status === 'queued' || b.downloading;
          return (
          <Card key={b.bibleId} style={[styles.card, b.downloaded && { borderColor: colors.primaryBorder }]}>
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
                {downloading ? <ProgressLine progress={progress} queued={task?.status === 'queued'} /> : null}
                {task?.status === 'error' ? (
                  <Text style={{ color: colors.danger, fontSize: 11 }}>{task.error}</Text>
                ) : null}
              </View>
              {downloading ? (
                <ActivityIndicator color={colors.primary} />
              ) : b.downloaded ? (
                <Button label="Eliminar" variant="outline" onPress={() => removeDownload(b.bibleId, b.abbr)} />
              ) : (
                <Button label="Descargar" onPress={() => startDownload(b)} />
              )}
            </View>
          </Card>
          );
        })
      )}

      <Text style={[typography.h2, { color: colors.text, marginTop: 16 }]}>Contenido de estudio</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
        Descarga el diccionario y las referencias cruzadas para estudiar sin conexión.
      </Text>
      {study.map((s) => {
        const task = taskForStudy(s.key);
        const progress = task?.progress ?? s.progress;
        const downloading = task?.status === 'running' || task?.status === 'queued' || s.downloading;
        return (
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
              {downloading ? <ProgressLine progress={progress} queued={task?.status === 'queued'} /> : null}
              {task?.status === 'error' ? (
                <Text style={{ color: colors.danger, fontSize: 11 }}>{task.error}</Text>
              ) : null}
            </View>
            {downloading ? (
              <ActivityIndicator color={colors.primary} />
            ) : s.downloaded ? (
              <Button label="Eliminar" variant="outline" onPress={() => removeStudyDownload(s.key, s.title)} />
            ) : (
              <Button label="Descargar" onPress={() => startStudyDownload(s.key)} />
            )}
          </View>
        </Card>
        );
      })}
    </ScrollView>
  );
}

function ProgressLine({
  progress,
  queued,
}: {
  progress?: DownloadProgress | StudyDownloadProgress;
  queued?: boolean;
}) {
  const { colors } = useAppTheme();
  const ratio = progress?.total ? Math.max(0.03, Math.min(1, progress.current / progress.total)) : 0.03;
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${ratio * 100}%` }]} />
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        {queued ? 'En cola' : progress ? `${progress.phase} (${progress.current}/${progress.total})` : 'Preparando descarga'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCard: { gap: 8, borderWidth: 1 },
  activeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  progressWrap: { gap: 4, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
});
