import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import {
  IMAGE_FORMATS,
  type ImageFormatId,
  bgImageTransform,
  formatById,
  mergeUnsplashPhotos,
  previewDimensions,
} from '@/lib/verseImageFormats';

const GRADIENTS = [
  { id: 'gold', colors: ['#92400e', '#451a03', '#1c1917'] as const },
  { id: 'sunset', colors: ['#ea580c', '#7c2d12', '#431407'] as const },
  { id: 'ocean', colors: ['#0369a1', '#155e75', '#083344'] as const },
  { id: 'forest', colors: ['#15803d', '#14532d', '#052e16'] as const },
  { id: 'purple', colors: ['#7e22ce', '#4c1d95', '#2e1065'] as const },
  { id: 'night', colors: ['#1d4ed8', '#312e81', '#0f172a'] as const },
] as const;

const SEARCH_HINTS = ['naturaleza', 'cielo', 'mar', 'montaña', 'amanecer', 'flores', 'cruz', 'bosque', 'atardecer', 'lluvia'];
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const AMBER = '#fbbf24';

type BgMode = 'gradient' | 'photo';

function textSizeForLength(len: number) {
  if (len > 220) return 15;
  if (len > 140) return 17;
  if (len > 80) return 19;
  return 22;
}

function VerseImageCard({
  text,
  reference,
  abbr,
  gradient,
  photoUri,
  bgMode,
  bgPosX,
  bgPosY,
  bgZoom,
  textSize,
  cardWidth,
  cardHeight,
  imageFormat,
  onPhotoLoad,
}: {
  text: string;
  reference: string;
  abbr: string;
  gradient: (typeof GRADIENTS)[number];
  photoUri: string | null;
  bgMode: BgMode;
  bgPosX: number;
  bgPosY: number;
  bgZoom: number;
  textSize: number;
  cardWidth: number;
  cardHeight: number;
  imageFormat: ImageFormatId;
  onPhotoLoad?: () => void;
}) {
  const scale = Math.min(cardWidth, cardHeight) / 270;
  const scaledText = Math.round(textSize * scale);
  const pad = cardWidth * 0.08;

  return (
    <View
      style={{
        width: cardWidth,
        height: cardHeight,
        overflow: 'hidden',
        borderRadius: imageFormat === '9:16' ? 0 : Math.round(16 * scale),
        backgroundColor: gradient.colors[0],
      }}
    >
      {bgMode === 'photo' && photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={[
            StyleSheet.absoluteFill,
            { transform: bgImageTransform(bgPosX, bgPosY, bgZoom, cardWidth, cardHeight) },
          ]}
          resizeMode="cover"
          onLoad={onPhotoLoad}
        />
      ) : (
        <LinearGradient colors={[...gradient.colors]} start={{ x: 0.15, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      )}

      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: 0.35 }]} />
      <LinearGradient colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />
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
          "
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

export interface VerseImageCreatorProps {
  visible: boolean;
  onClose: () => void;
  text: string;
  reference: string;
  abbr: string;
}

export function VerseImageCreator({ visible, onClose, text, reference, abbr }: VerseImageCreatorProps) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding(12);
  const shotRef = useRef<ViewShotRef>(null);
  const imageFormatRef = useRef<ImageFormatId>('9:16');
  const [imageFormat, setImageFormat] = useState<ImageFormatId>('9:16');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [bgMode, setBgMode] = useState<BgMode>('gradient');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [bgPosX, setBgPosX] = useState(50);
  const [bgPosY, setBgPosY] = useState(50);
  const [bgZoom, setBgZoom] = useState(100);
  const [unsplashImages, setUnsplashImages] = useState<api.UnsplashImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<string | undefined>();
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [photoReady, setPhotoReady] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [textSize, setTextSize] = useState(20);
  const gradient = GRADIENTS[gradientIdx];
  const format = formatById(imageFormat);
  const exportW = format.width;
  const exportH = format.height;
  const screen = Dimensions.get('window');
  const previewMaxW = screen.width - 48;
  const previewMaxH = Math.min(380, screen.height * 0.36);
  const preview = previewDimensions(format, previewMaxW, previewMaxH);
  imageFormatRef.current = imageFormat;

  const exportCardProps = {
    text,
    reference,
    abbr,
    gradient,
    photoUri,
    bgMode,
    bgPosX,
    bgPosY,
    bgZoom,
    textSize,
    cardWidth: exportW,
    cardHeight: exportH,
    imageFormat,
    onPhotoLoad: () => setPhotoReady(true),
  };

  const previewCardProps = {
    ...exportCardProps,
    cardWidth: preview.width,
    cardHeight: preview.height,
    onPhotoLoad: undefined as (() => void) | undefined,
  };

  const loadPhotos = useCallback(async (
    query?: string,
    page = 1,
    append = false,
    formatId?: ImageFormatId,
  ) => {
    if (page === 1) setLoadingPhotos(true);
    else setLoadingMorePhotos(true);
    try {
      const res = await api.fetchUnsplashImages(query, {
        page,
        orientation: formatById(formatId ?? imageFormatRef.current).unsplashOrientation,
      });
      setUnsplashImages((prev) => (append ? mergeUnsplashPhotos(prev, res.images) : res.images));
      setPhotosPage(page);
      setHasMorePhotos(res.hasMore);
    } catch {
      if (!append) setUnsplashImages([]);
    } finally {
      setLoadingPhotos(false);
      setLoadingMorePhotos(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setTextSize(textSizeForLength(text.length));
  }, [visible, text]);

  useEffect(() => {
    if (!visible) return;
    setSearchQuery('');
    setActiveSearch(undefined);
    setPhotosPage(1);
    setHasMorePhotos(false);
    setBgMode('gradient');
    setPhotoUri(null);
    setSelectedPhotoId(null);
    setGradientIdx(0);
    setImageFormat('9:16');
    setBgPosX(50);
    setBgPosY(50);
    setBgZoom(100);
    loadPhotos(undefined, 1, false);
  }, [visible, loadPhotos]);

  const selectFormat = (id: ImageFormatId) => {
    setImageFormat(id);
    loadPhotos(activeSearch, 1, false, id);
  };

  const selectGradient = (idx: number) => {
    setGradientIdx(idx);
    setBgMode('gradient');
    setPhotoUri(null);
    setSelectedPhotoId(null);
    setPhotoReady(true);
  };

  const selectPhoto = (uri: string, id: string | null) => {
    setBgMode('photo');
    setPhotoUri(uri);
    setSelectedPhotoId(id);
    setPhotoReady(false);
  };

  const pickLocalPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      selectPhoto(result.assets[0].uri, null);
    }
  };

  const runSearch = () => {
    const q = searchQuery.trim() || undefined;
    setActiveSearch(q);
    loadPhotos(q, 1, false);
  };

  const loadMorePhotos = () => {
    if (!hasMorePhotos || loadingMorePhotos) return;
    loadPhotos(activeSearch, photosPage + 1, true);
  };

  const captureImage = async () => {
    if (!shotRef.current?.capture || (bgMode === 'photo' && !photoReady)) return null;
    // ponytail: brief wait so remote Unsplash image finishes painting before capture
    if (bgMode === 'photo' && photoUri?.startsWith('http')) {
      await new Promise((r) => setTimeout(r, 300));
    }
    return shotRef.current.capture();
  };

  const shareImage = async () => {
    setExporting(true);
    try {
      const uri = await captureImage();
      if (!uri) return;
      if (!(await Sharing.isAvailableAsync())) return;
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: reference });
      onClose();
    } catch {
      // Ignorar cancelaciones
    } finally {
      setExporting(false);
    }
  };

  const downloadImage = async () => {
    setExporting(true);
    try {
      const uri = await captureImage();
      if (!uri) return;
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso para guardar la imagen en tu galería.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Guardada', 'La imagen se guardó en tu galería.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la imagen.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl, paddingBottom: contentPadding }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Crear imagen</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollBody, { paddingBottom: 8 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Formato</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formatRow}>
              {IMAGE_FORMATS.map((fmt) => {
                const active = imageFormat === fmt.id;
                return (
                  <Pressable
                    key={fmt.id}
                    onPress={() => selectFormat(fmt.id)}
                    style={[
                      styles.formatBtn,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? `${colors.primary}18` : colors.muted,
                      },
                    ]}
                  >
                    <View style={{ width: fmt.previewW, height: fmt.previewH, borderWidth: 2, borderColor: active ? colors.primary : colors.textMuted, borderRadius: 3 }} />
                    <Text style={{ color: active ? colors.primary : colors.text, fontSize: 10, fontWeight: '700' }}>{fmt.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 8 }}>{fmt.hint}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.previewWrap, { minHeight: preview.height + 16 }]}>
              <View style={styles.exportCanvas} pointerEvents="none">
                <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
                  <VerseImageCard {...exportCardProps} />
                </ViewShot>
              </View>

              <View style={[styles.previewFrame, { width: preview.width, height: preview.height }]}>
                <VerseImageCard {...previewCardProps} />
              </View>
            </View>

            <View style={[styles.adjustBox, { borderColor: colors.border }]}>
              <View style={styles.textSizeRow}>
                <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Tamaño de letra</Text>
                <Pressable onPress={() => setTextSize(textSizeForLength(text.length))} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>Auto</Text>
                </Pressable>
              </View>
              <View style={styles.adjustRow}>
                <Pressable
                  onPress={() => setTextSize((v) => Math.max(10, v - 1))}
                  style={[styles.adjustBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
                </Pressable>
                <Text style={[styles.textSizeValue, { color: colors.text }]}>{textSize}</Text>
                <Pressable
                  onPress={() => setTextSize((v) => Math.min(36, v + 1))}
                  style={[styles.adjustBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
                </Pressable>
              </View>
            </View>

            {bgMode === 'photo' && photoUri ? (
              <View style={[styles.adjustBox, { borderColor: colors.border }]}>
                <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Zoom {bgZoom}%</Text>
                <View style={styles.adjustRow}>
                  <Pressable onPress={() => setBgZoom((v) => Math.max(100, v - 5))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>−</Text>
                  </Pressable>
                  <Pressable onPress={() => setBgZoom((v) => Math.min(200, v + 5))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>+</Text>
                  </Pressable>
                </View>
                <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Mover fondo ← →</Text>
                <View style={styles.adjustRow}>
                  <Pressable onPress={() => setBgPosX((v) => Math.max(0, v - 10))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>←</Text>
                  </Pressable>
                  <Pressable onPress={() => setBgPosX((v) => Math.min(100, v + 10))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>→</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Colores</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradientRow}>
              {GRADIENTS.map((g, i) => (
                <Pressable
                  key={g.id}
                  onPress={() => selectGradient(i)}
                  style={[
                    styles.gradientSwatch,
                    bgMode === 'gradient' && i === gradientIdx && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <LinearGradient colors={[...g.colors]} style={StyleSheet.absoluteFill} />
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Fotos (Unsplash)</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.muted }]}
                placeholder="Buscar fondo (mar, cielo, cruz…)"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={runSearch}
                returnKeyType="search"
              />
              <Pressable
                style={[styles.searchBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                onPress={runSearch}
              >
                <Text style={styles.searchBtnText}>Buscar</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hintRow}>
              {SEARCH_HINTS.map((hint) => (
                <Pressable
                  key={hint}
                  style={[
                    styles.hintChip,
                    {
                      borderColor: activeSearch === hint ? colors.primary : colors.border,
                      backgroundColor: activeSearch === hint ? `${colors.primary}18` : colors.muted,
                    },
                  ]}
                  onPress={() => {
                    setSearchQuery(hint);
                    setActiveSearch(hint);
                    loadPhotos(hint, 1, false);
                  }}
                >
                  <Text style={{ color: activeSearch === hint ? colors.primary : colors.textMuted, fontSize: 12 }}>
                    {hint}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.photoGrid}>
              <Pressable
                style={[styles.photoThumb, styles.uploadThumb, { borderColor: colors.border }]}
                onPress={pickLocalPhoto}
              >
                <Text style={{ color: colors.textMuted, fontSize: 22 }}>+</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>Galería</Text>
              </Pressable>

              {loadingPhotos ? (
                <View style={[styles.photoThumb, styles.loadingThumb]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                unsplashImages.map((img) => (
                  <Pressable
                    key={img.id}
                    onPress={() => selectPhoto(img.url, img.id)}
                    style={[
                      styles.photoThumb,
                      bgMode === 'photo' && selectedPhotoId === img.id && {
                        borderColor: colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Image source={{ uri: img.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  </Pressable>
                ))
              )}
            </View>

            {hasMorePhotos && !loadingPhotos ? (
              <Pressable
                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                onPress={loadMorePhotos}
                disabled={loadingMorePhotos}
              >
                {loadingMorePhotos ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Cargar más fotos</Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.downloadBtn,
                {
                  borderColor: colors.border,
                  borderRadius: radius.full,
                  opacity: exporting || (bgMode === 'photo' && !photoReady) ? 0.6 : 1,
                },
              ]}
              onPress={downloadImage}
              disabled={exporting || (bgMode === 'photo' && !photoReady)}
            >
              {exporting ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[styles.downloadBtnText, { color: colors.text }]}>Descargar</Text>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.shareBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.full,
                  opacity: exporting || (bgMode === 'photo' && !photoReady) ? 0.6 : 1,
                },
              ]}
              onPress={shareImage}
              disabled={exporting || (bgMode === 'photo' && !photoReady)}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.shareBtnText}>Compartir imagen</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 20, gap: 12, maxHeight: '94%' },
  scrollBody: { gap: 10, paddingBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  previewWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  previewFrame: { overflow: 'hidden', borderRadius: 12 },
  exportCanvas: { position: 'absolute', left: -9999, opacity: 0 },
  formatRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  formatBtn: { alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  adjustBox: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  textSizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textSizeValue: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  adjustLabel: { fontSize: 11, fontWeight: '600' },
  adjustRow: { flexDirection: 'row', gap: 8 },
  adjustBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gradientRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  gradientSwatch: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hintRow: { flexDirection: 'row', gap: 8 },
  hintChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 90, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  uploadThumb: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  loadingThumb: { alignItems: 'center', justifyContent: 'center' },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  downloadBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  downloadBtnText: { fontWeight: '700', fontSize: 16 },
  shareBtn: { flex: 1.4, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
