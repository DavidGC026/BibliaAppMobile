import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { useAppTheme } from '@/hooks/useAppTheme';

const GRADIENTS = [
  { id: 'gold', colors: ['#92400e', '#451a03', '#1c1917'] as const },
  { id: 'sunset', colors: ['#ea580c', '#7c2d12', '#431407'] as const },
  { id: 'ocean', colors: ['#0369a1', '#155e75', '#083344'] as const },
  { id: 'forest', colors: ['#15803d', '#14532d', '#052e16'] as const },
  { id: 'purple', colors: ['#7e22ce', '#4c1d95', '#2e1065'] as const },
  { id: 'night', colors: ['#1d4ed8', '#312e81', '#0f172a'] as const },
] as const;

const CARD_W = 270;
const CARD_H = 480;

export function VerseImageCreatorModal({
  visible,
  onClose,
  text,
  reference,
  abbr,
}: {
  visible: boolean;
  onClose: () => void;
  text: string;
  reference: string;
  abbr: string;
}) {
  const { colors, radius } = useAppTheme();
  const shotRef = useRef<ViewShotRef>(null);
  const [gradientIdx, setGradientIdx] = useState(0);
  const [exporting, setExporting] = useState(false);
  const gradient = GRADIENTS[gradientIdx];

  const shareImage = async () => {
    if (!shotRef.current?.capture) return;
    setExporting(true);
    try {
      const uri = await shotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: reference });
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Crear imagen</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>

          <View style={styles.previewWrap}>
            <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
              <LinearGradient colors={[...gradient.colors]} style={styles.card}>
                <View style={styles.cardOverlay} />
                <Text style={styles.cardText}>"{text}"</Text>
                <Text style={styles.cardRef}>{reference}</Text>
                <Text style={styles.cardAbbr}>{abbr}</Text>
              </LinearGradient>
            </ViewShot>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradientRow}>
            {GRADIENTS.map((g, i) => (
              <Pressable
                key={g.id}
                onPress={() => setGradientIdx(i)}
                style={[styles.gradientSwatch, i === gradientIdx && { borderColor: colors.primary, borderWidth: 2 }]}
              >
                <LinearGradient colors={[...g.colors]} style={StyleSheet.absoluteFill} />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.shareBtn, { backgroundColor: colors.primary, borderRadius: radius.full }]}
            onPress={shareImage}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.shareBtnText}>Compartir imagen</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 20, gap: 16, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  previewWrap: { alignItems: 'center' },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
    zIndex: 1,
  },
  cardRef: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
    zIndex: 1,
  },
  cardAbbr: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 6,
    zIndex: 1,
  },
  gradientRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  gradientSwatch: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  shareBtn: { paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
