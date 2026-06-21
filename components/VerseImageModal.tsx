import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import type { UnsplashImage } from '@/lib/types';

interface VerseImageModalProps {
  visible: boolean;
  text: string;
  reference: string;
  theme: string;
  abbr: string;
  onClose: () => void;
}

type AspectRatio = '9:16' | '3:4' | '1:1';
type EditorTab = 'format' | 'backgrounds' | 'settings';

interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string, string, string];
  swatch: [string, string];
}

const GRADIENTS: GradientPreset[] = [
  { id: 'gold', name: 'Oro', colors: ['#92400e', '#78350f', '#451a03', '#1c1917'], swatch: ['#fbbf24', '#92400e'] },
  { id: 'sunset', name: 'Atardecer', colors: ['#ea580c', '#c2410c', '#7c2d12', '#431407'], swatch: ['#fb923c', '#dc2626'] },
  { id: 'ocean', name: 'Océano', colors: ['#0369a1', '#0e7490', '#155e75', '#083344'], swatch: ['#38bdf8', '#0369a1'] },
  { id: 'forest', name: 'Bosque', colors: ['#15803d', '#166534', '#14532d', '#052e16'], swatch: ['#4ade80', '#15803d'] },
  { id: 'purple', name: 'Púrpura', colors: ['#7e22ce', '#6d28d9', '#4c1d95', '#2e1065'], swatch: ['#c084fc', '#7c3aed'] },
  { id: 'rose', name: 'Rosa', colors: ['#e11d48', '#be123c', '#881337', '#4c0519'], swatch: ['#fb7185', '#e11d48'] },
  { id: 'night', name: 'Noche', colors: ['#1d4ed8', '#4338ca', '#312e81', '#0f172a'], swatch: ['#60a5fa', '#4338ca'] },
  { id: 'earth', name: 'Tierra', colors: ['#a16207', '#854d0e', '#713f12', '#292524'], swatch: ['#fcd34d', '#a16207'] },
];

const RATIO_VALUE: Record<AspectRatio, number> = { '9:16': 9 / 16, '3:4': 3 / 4, '1:1': 1 };
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const AMBER = '#fbbf24';

function autoTextSize(text: string) {
  if (text.length > 220) return 15;
  if (text.length > 140) return 17;
  if (text.length > 80) return 19;
  return 22;
}

function VerseImageCard({
  text,
  reference,
  abbr,
  gradient,
  photoUri,
  bgBlur,
  overlayOpacity,
  textSize,
  cardWidth,
  ratio,
  onPhotoLoad,
}: {
  text: string;
  reference: string;
  abbr: string;
  gradient: GradientPreset;
  photoUri: string | null;
  bgBlur: number;
  overlayOpacity: number;
  textSize: number;
  cardWidth: number;
  ratio: AspectRatio;
  onPhotoLoad?: () => void;
}) {
  // El diseño replica components/verse-image-creator.tsx: escala todo según el ancho.
  const scale = cardWidth / 270;
  const scaledText = Math.round(textSize * scale);
  const pad = cardWidth * 0.08;

  return (
    <View
      style={{
        width: cardWidth,
        aspectRatio: RATIO_VALUE[ratio],
        overflow: 'hidden',
        borderRadius: ratio === '9:16' ? 0 : Math.round(16 * scale),
        backgroundColor: gradient.colors[0],
      }}
    >
      {photoUri ? (
        <ImageBackground
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          blurRadius={bgBlur}
          onLoad={onPhotoLoad}
        />
      ) : (
        <LinearGradient
          colors={gradient.colors}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Oscurecido + viñeta aproximada */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayOpacity / 100 }]} />
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.35)']}
        style={StyleSheet.absoluteFill}
      />
      {/* Resplandor superior ámbar */}
      <LinearGradient
        colors={['rgba(251,191,36,0.12)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: pad }}>
        <Text
          style={{
            fontFamily: SERIF,
            fontSize: scaledText * 2.2,
            lineHeight: scaledText * 2.2,
            color: 'rgba(251,191,36,0.25)',
            marginBottom: scaledText * 0.2,
          }}
        >
          “
        </Text>

        <Text
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: scaledText,
            lineHeight: scaledText * 1.55,
            color: '#ffffff',
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 20,
            marginBottom: scaledText * 0.6,
            maxWidth: '92%',
          }}
        >
          {text}
        </Text>

        <LinearGradient
          colors={['transparent', AMBER, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: scaledText * 1.8,
            height: Math.max(2, scale * 2),
            borderRadius: 999,
            marginBottom: scaledText * 0.45,
          }}
        />

        <Text
          style={{
            fontWeight: '600',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'rgba(251,191,36,0.9)',
            fontSize: Math.max(11, scaledText * 0.48),
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
            textAlign: 'center',
          }}
        >
          {reference}
        </Text>
        <Text
          style={{
            marginTop: scaledText * 0.2,
            fontWeight: '500',
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.55)',
            fontSize: Math.max(10, scaledText * 0.38),
          }}
        >
          {abbr}
        </Text>
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  colors,
  radius,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
  radius: ReturnType<typeof useAppTheme>['radius'];
}) {
  return (
    <View style={[styles.settingRow, { borderColor: colors.border, borderRadius: radius.lg }]}>
      <Text style={[styles.settingLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.stepValue, { color: colors.primary }]}>
          {value}
          {unit}
        </Text>
        <Pressable
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VerseImageModal({ visible, text, reference, theme, abbr, onClose }: VerseImageModalProps) {
  const { colors, radius } = useAppTheme();
  const [gradient, setGradient] = useState<GradientPreset>(GRADIENTS[0]);
  const [photos, setPhotos] = useState<UnsplashImage[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [textSize, setTextSize] = useState(20);
  const [overlayOpacity, setOverlayOpacity] = useState(35);
  const [bgBlur, setBgBlur] = useState(0);
  const [editorTab, setEditorTab] = useState<EditorTab>('backgrounds');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const isPhoto = !!photoUrl;

  useEffect(() => {
    if (!visible) return;
    setTextSize(autoTextSize(text));
  }, [visible, text]);

  useEffect(() => {
    if (!visible || photos.length > 0) return;
    setLoadingPhotos(true);
    api
      .getUnsplashPhotos()
      .then(({ images }) => setPhotos(images))
      .catch(() => {})
      .finally(() => setLoadingPhotos(false));
  }, [visible, photos.length]);

  const selectGradient = (g: GradientPreset) => {
    setGradient(g);
    setPhotoUrl(null);
    setSelectedPhotoId(null);
    setPhotoReady(false);
  };

  const selectPhoto = (img: UnsplashImage) => {
    setPhotoUrl(api.getImageProxyUrl(img.url));
    setSelectedPhotoId(img.id);
    setPhotoReady(false);
  };

  const shareImage = async () => {
    if (!cardRef.current) return;
    if (isPhoto && !photoReady) return;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
    } catch {
      // Ignorar cancelaciones
    } finally {
      setBusy(false);
    }
  };

  const screen = Dimensions.get('window');
  const previewMaxW = screen.width - 48;
  const previewMaxH = screen.height * 0.4;
  const ratioVal = RATIO_VALUE[aspectRatio];
  const cardWidth = Math.min(previewMaxW, previewMaxH * ratioVal);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#09090b' }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
            <Text style={styles.headerClose}>✕</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerEyebrow}>EDITOR</Text>
            <Text style={styles.headerTitle}>Crear imagen</Text>
          </View>
          <Pressable
            style={[styles.shareBtn, { backgroundColor: colors.primary, opacity: busy || (isPhoto && !photoReady) ? 0.6 : 1 }]}
            disabled={busy || (isPhoto && !photoReady)}
            onPress={shareImage}
          >
            <Text style={styles.shareBtnText}>{busy ? '…' : 'Compartir'}</Text>
          </Pressable>
        </View>

        <View style={styles.preview}>
          <View ref={cardRef} collapsable={false}>
            <VerseImageCard
              text={text}
              reference={reference}
              abbr={abbr}
              gradient={gradient}
              photoUri={photoUrl}
              bgBlur={bgBlur}
              overlayOpacity={overlayOpacity}
              textSize={textSize}
              cardWidth={cardWidth}
              ratio={aspectRatio}
              onPhotoLoad={() => setPhotoReady(true)}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.grabber} />

          <ScrollView style={styles.panelBody} contentContainerStyle={{ paddingBottom: 8 }}>
            {editorTab === 'format' ? (
              <View style={styles.formatRow}>
                {([
                  { ratio: '9:16' as AspectRatio, label: 'Historia', hint: 'Vertical', w: 18, h: 32 },
                  { ratio: '3:4' as AspectRatio, label: 'Retrato', hint: '3:4', w: 24, h: 32 },
                  { ratio: '1:1' as AspectRatio, label: 'Cuadrado', hint: '1:1', w: 30, h: 30 },
                ]).map(({ ratio, label, hint, w, h }) => {
                  const active = aspectRatio === ratio;
                  return (
                    <Pressable
                      key={ratio}
                      style={[
                        styles.formatBtn,
                        { borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)', backgroundColor: active ? 'rgba(251,191,36,0.1)' : 'transparent' },
                      ]}
                      onPress={() => setAspectRatio(ratio)}
                    >
                      <View style={{ width: w, height: h, borderWidth: 2, borderColor: active ? colors.primary : 'rgba(255,255,255,0.5)', borderRadius: 3 }} />
                      <Text style={{ color: active ? colors.primary : 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 }}>{label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{hint}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {editorTab === 'backgrounds' ? (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={styles.groupLabel}>COLORES</Text>
                  <View style={styles.swatchGrid}>
                    {GRADIENTS.map((g) => {
                      const active = !isPhoto && gradient.id === g.id;
                      return (
                        <Pressable key={g.id} onPress={() => selectGradient(g)} style={styles.swatchCell}>
                          <LinearGradient
                            colors={g.swatch}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.swatch, { borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)' }]}
                          />
                          <Text style={styles.swatchLabel} numberOfLines={1}>{g.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text style={styles.groupLabel}>FOTOS</Text>
                  {loadingPhotos ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
                  ) : (
                    <View style={styles.swatchGrid}>
                      {photos.map((img) => {
                        const active = isPhoto && selectedPhotoId === img.id;
                        return (
                          <Pressable key={img.id} onPress={() => selectPhoto(img)} style={styles.swatchCell}>
                            <Image
                              source={{ uri: img.thumb }}
                              style={[styles.photoSwatch, { borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)' }]}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {editorTab === 'settings' ? (
              <View style={{ gap: 12 }}>
                <Stepper label="TAMAÑO DE LETRA" value={textSize} unit="" min={12} max={36} step={1} onChange={setTextSize} colors={colors} radius={radius} />
                <Stepper label="OSCURECER FONDO" value={overlayOpacity} unit="%" min={0} max={80} step={5} onChange={setOverlayOpacity} colors={colors} radius={radius} />
                {isPhoto ? (
                  <Stepper label="DIFUMINAR FOTO" value={bgBlur} unit="" min={0} max={20} step={1} onChange={setBgBlur} colors={colors} radius={radius} />
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.tabBar}>
            {([
              { tab: 'format' as EditorTab, label: 'Formato' },
              { tab: 'backgrounds' as EditorTab, label: 'Fondos' },
              { tab: 'settings' as EditorTab, label: 'Ajustes' },
            ]).map(({ tab, label }) => {
              const active = editorTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, active && { backgroundColor: 'rgba(251,191,36,0.1)' }]}
                  onPress={() => setEditorTab(tab)}
                >
                  <Text style={{ color: active ? colors.primary : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBtn: { width: 60 },
  headerClose: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  headerEyebrow: { color: 'rgba(251,191,36,0.8)', fontSize: 10, fontWeight: '600', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },
  shareBtn: { width: 96, alignItems: 'center', borderRadius: 999, paddingVertical: 9 },
  shareBtnText: { color: '#1c1917', fontWeight: '700', fontSize: 13 },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    maxHeight: '44%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 8, marginBottom: 4 },
  panelBody: { paddingHorizontal: 16, paddingTop: 8 },
  formatRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8 },
  formatBtn: { alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
  groupLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchCell: { width: 56, alignItems: 'center', gap: 4 },
  swatch: { width: 56, height: 56, borderRadius: 10, borderWidth: 2 },
  swatchLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, textAlign: 'center' },
  photoSwatch: { width: 56, height: 70, borderRadius: 10, borderWidth: 2 },
  settingRow: { borderWidth: 1, padding: 14, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, fontWeight: '700' },
  stepValue: { fontSize: 14, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
});
