import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VerseImageCreator } from '@/components/VerseImageCreator';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import { DEFAULT_BIBLE_ID } from '@/lib/config';
import { resolveVerseBackgroundImage } from '@/lib/resolveVerseBackground';
import { updateVerseWidget } from '@/lib/verseWidgetUpdate';
import type { BibleVersion, VerseOfDay } from '@/lib/types';

export function VerseOfDayCard() {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [data, setData] = useState<VerseOfDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);

  const currentBible = bibles.find((b) => b.bibleId === bibleId);
  const abbr = currentBible?.abbr ?? 'RVR1960';
  const hasBg = Boolean(data?.backgroundImage);

  useEffect(() => {
    api.listBibles().then(({ bibles: list }) => setBibles(list)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getVerseOfDay(bibleId)
      .then(async (v) => {
        if (cancelled) return;
        if (!v.backgroundImage && v.theme) {
          v = { ...v, backgroundImage: (await resolveVerseBackgroundImage(v)) ?? undefined };
        }
        setData(v);
        updateVerseWidget(v).catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No disponible');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bibleId]);

  if (loading) {
    return (
      <Card style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card style={styles.center}>
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>Versículo del día</Text>
        <Text style={{ color: colors.textMuted }}>{error ?? 'No disponible hoy.'}</Text>
      </Card>
    );
  }

  const share = async () => {
    try {
      await Share.share({
        message: `"${data.text}"\n\n— ${data.reference} (${abbr})\nTema: ${data.theme}\n\nLee más en: https://biblia2.dvguzman.com`,
      });
    } catch {
      // Ignorar cancelación
    }
  };

  const readChapter = () => {
    router.navigate({
      pathname: '/(tabs)/bible',
      params: {
        bookId: String(data.idBook),
        chapter: String(data.chapter),
        bibleId: String(data.idBible),
      },
    });
  };

  const content = (
    <View style={styles.inner}>
      {data.theme ? <Badge label={data.theme} themeKey={data.theme} /> : null}

      <Text style={[styles.verseText, hasBg && styles.verseTextOnImage]}>
        "{data.text}"
      </Text>

      <Text style={[styles.reference, hasBg ? styles.referenceOnImage : { color: colors.textMuted }]}>
        — {data.reference}
      </Text>

      <Pressable
        style={[
          styles.versionPill,
          {
            backgroundColor: hasBg ? 'rgba(255,255,255,0.18)' : colors.muted,
            borderRadius: radius.full,
          },
        ]}
        onPress={() => setVersionOpen(true)}
      >
        <Text style={[styles.versionText, hasBg && { color: '#fff' }]}>{abbr}</Text>
        <Text style={{ color: hasBg ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 11 }}>▾</Text>
      </Pressable>

      <View style={styles.actions}>
        <Button
          label="Leer capítulo"
          variant="outline"
          onPress={readChapter}
          style={[styles.actionBtn, { borderRadius: radius.full }, hasBg && styles.btnOnImage]}
        />
        <Button
          label="Crear imagen"
          variant="outline"
          onPress={() => setImageModalOpen(true)}
          style={[styles.actionBtn, { borderRadius: radius.full }, hasBg && styles.btnOnImage]}
        />
        <Button
          label="Compartir"
          onPress={share}
          style={[styles.actionBtn, { borderRadius: radius.full }]}
        />
      </View>
    </View>
  );

  return (
    <Card style={[styles.card, { overflow: 'hidden', padding: 0 }]}>
      {hasBg ? (
        <ImageBackground
          source={{ uri: data.backgroundImage! }}
          style={styles.frame}
          imageStyle={styles.frameImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          {content}
        </ImageBackground>
      ) : (
        <>
          <View style={[styles.glow, { backgroundColor: `${colors.primary}12` }]} />
          <View style={[styles.glow2, { backgroundColor: '#3B82F612' }]} />
          <View style={styles.frameFallback}>{content}</View>
        </>
      )}

      <Modal visible={versionOpen} animationType="slide" transparent onRequestClose={() => setVersionOpen(false)}>
        <Pressable style={[styles.overlayModal, { paddingBottom: insets.bottom }]} onPress={() => setVersionOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Versión de la Biblia</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {bibles.map((b) => {
                const active = b.bibleId === bibleId;
                return (
                  <Pressable
                    key={b.bibleId}
                    style={[styles.versionRow, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setBibleId(b.bibleId);
                      setVersionOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: active ? colors.primary : colors.text, fontWeight: '700', fontSize: 15 }}>
                        {b.abbr}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{b.name}</Text>
                    </View>
                    {active ? <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <VerseImageCreator
        visible={imageModalOpen}
        text={data.text}
        reference={data.reference}
        abbr={abbr}
        onClose={() => setImageModalOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: 40 },
  center: { alignItems: 'center', gap: 8 },
  card: { position: 'relative' },
  frame: {
    width: '100%',
    aspectRatio: 3 / 4,
    justifyContent: 'center',
  },
  frameImage: { borderRadius: 14 },
  frameFallback: {
    width: '100%',
    aspectRatio: 3 / 4,
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 14,
  },
  glow: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60 },
  glow2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60 },
  inner: { alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 28, zIndex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  verseText: { textAlign: 'center', fontWeight: '500', fontSize: 20, lineHeight: 30, maxWidth: 520, color: '#1C1917' },
  verseTextOnImage: { color: '#FAFAF9' },
  reference: { fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  referenceOnImage: { color: 'rgba(255,255,255,0.85)' },
  versionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  versionText: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  btnOnImage: { borderColor: 'rgba(255,255,255,0.35)' },
  overlayModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  versionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
});
