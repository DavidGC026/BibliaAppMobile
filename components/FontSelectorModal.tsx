import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import {
  deleteFont,
  downloadFont,
  fetchGoogleFontUrl,
  getDownloadedFonts,
  POPULAR_FONTS,
  type FontItem,
} from '@/lib/fontManager';

interface FontSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (fontId: string) => void;
  currentFont: string;
}

export function FontSelectorModal({
  visible,
  onClose,
  onSelect,
  currentFont,
}: FontSelectorModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding(24);

  const [downloadedList, setDownloadedList] = useState<FontItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load the downloaded fonts list on open
  useEffect(() => {
    if (visible) {
      getDownloadedFonts().then(setDownloadedList);
    }
  }, [visible]);

  // Combine default system fonts, popular list, and extra downloaded ones
  const systemFonts: FontItem[] = [
    { id: 'Default', name: 'Defect (Sans)', category: 'Sistema', url: '' },
    { id: 'serif', name: 'Serif (Sistema)', category: 'Sistema', url: '' },
    { id: 'monospace', name: 'Monospace (Sistema)', category: 'Sistema', url: '' },
  ];

  const handleDownload = async (font: FontItem) => {
    setDownloadingId(font.id);
    try {
      await downloadFont(font);
      const list = await getDownloadedFonts();
      setDownloadedList(list);
      Alert.alert('Éxito', `Fuente ${font.name} descargada e instalada correctamente.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo descargar la fuente.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fontId: string) => {
    Alert.alert('Eliminar fuente', '¿Estás seguro de que quieres eliminar esta fuente de tu almacenamiento local?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteFont(fontId);
          if (success) {
            const list = await getDownloadedFonts();
            setDownloadedList(list);
          } else {
            Alert.alert('Error', 'No se pudo eliminar la fuente.');
          }
        },
      },
    ]);
  };

  const handleSearchGoogleFonts = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url = await fetchGoogleFontUrl(q);
      const fontId = q.replace(/\s+/g, '');
      const newFont: FontItem = {
        id: fontId,
        name: q,
        category: 'Google Fonts',
        url,
      };

      // Check if it's already popular or downloaded
      const isRegistered =
        POPULAR_FONTS.some((f) => f.id === fontId) ||
        downloadedList.some((f) => f.id === fontId);

      if (!isRegistered) {
        // Automatically start download
        await handleDownload(newFont);
      } else {
        Alert.alert('Info', 'Esta fuente ya está en tu catálogo o descargada.');
      }
      setSearchQuery('');
    } catch (err) {
      Alert.alert('No encontrada', err instanceof Error ? err.message : 'No se encontró la fuente.');
    } finally {
      setSearching(false);
    }
  };

  const renderFontItem = ({ item }: { item: FontItem }) => {
    const isDownloaded =
      item.url === '' || downloadedList.some((f) => f.id === item.id);
    const isActive = currentFont === item.id;
    const isDownloading = downloadingId === item.id;

    // We only apply the font style if it is loaded (meaning it is downloaded or is system default)
    const fontStyle = isDownloaded
      ? { fontFamily: item.id === 'Default' ? undefined : item.id }
      : { fontFamily: undefined };

    return (
      <View
        style={[
          styles.itemRow,
          {
            borderColor: colors.border,
            backgroundColor: isActive ? colors.primarySoft : colors.card,
          },
        ]}
      >
        <Pressable
          style={styles.itemClickable}
          onPress={() => {
            if (isDownloaded) {
              onSelect(item.id);
              onClose();
            } else {
              handleDownload(item);
            }
          }}
        >
          <View style={styles.itemTextContainer}>
            <Text
              style={[
                styles.fontPreview,
                fontStyle,
                { color: colors.text, fontSize: 18 },
              ]}
            >
              {item.name}
            </Text>
            <Text style={[styles.fontMeta, { color: colors.textMuted }]}>
              {item.category} • {isDownloaded ? 'Disponible offline' : 'Toca para descargar'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.actionContainer}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : !isDownloaded ? (
            <Pressable
              style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleDownload(item)}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: 11 }}>
                Descargar
              </Text>
            </Pressable>
          ) : (
            item.url !== '' && (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={{ color: colors.danger, fontSize: 18 }}>🗑️</Text>
              </Pressable>
            )
          )}
        </View>
      </View>
    );
  };

  // Build the list of displayed fonts:
  // 1. System fonts
  // 2. Downloaded custom fonts (not already in system or popular)
  // 3. Curated POPULAR_FONTS
  const allFontsToShow = [...systemFonts];

  // Add downloaded fonts that are not in POPULAR_FONTS
  downloadedList.forEach((df) => {
    if (!POPULAR_FONTS.some((pf) => pf.id === df.id)) {
      allFontsToShow.push(df);
    }
  });

  // Add popular fonts
  POPULAR_FONTS.forEach((pf) => {
    allFontsToShow.push(pf);
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <View style={[styles.modalBox, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: contentPadding }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Tipografías</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>Cerrar</Text>
            </Pressable>
          </View>

          {/* Search bar for Google Fonts */}
          <View style={styles.searchBox}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="Escribe el nombre en Google Fonts..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchGoogleFonts}
            />
            <Pressable
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={handleSearchGoogleFonts}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>Buscar</Text>
              )}
            </Pressable>
          </View>

          <FlatList
            data={allFontsToShow}
            keyExtractor={(item) => item.id}
            renderItem={renderFontItem}
            contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    paddingHorizontal: 8,
  },
  searchBox: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
  },
  searchBtn: {
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    alignItems: 'center',
    paddingRight: 10,
  },
  itemClickable: {
    flex: 1,
    padding: 14,
  },
  itemTextContainer: {
    gap: 4,
  },
  fontPreview: {
    fontWeight: '400',
  },
  fontMeta: {
    fontSize: 11,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  downloadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  deleteBtn: {
    padding: 8,
  },
});
