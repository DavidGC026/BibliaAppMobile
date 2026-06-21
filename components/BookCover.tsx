import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AuthedImage } from '@/components/AuthedImage';
import { getPresetCover, isCustomCoverUrl } from '@/lib/notebookCovers';
import { resolveMediaUrl } from '@/lib/media';
import * as api from '@/lib/api';

interface BookCoverProps {
  title: string;
  coverImage?: string | null;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function BookCover({
  title,
  coverImage,
  width = 128,
  height = 176,
  style,
  onPress,
}: BookCoverProps) {
  const preset = !isCustomCoverUrl(coverImage) ? getPresetCover(coverImage) : null;
  const customUrl = isCustomCoverUrl(coverImage) ? coverImage : null;
  const imageUri = customUrl
    ? customUrl.includes('images.unsplash.com')
      ? api.getImageProxyUrl(customUrl)
      : resolveMediaUrl(customUrl)
    : null;

  const inner = (
    <View style={[styles.wrap, { width, height, borderTopRightRadius: 12, borderBottomRightRadius: 12 }, style]}>
      {imageUri ? (
        customUrl?.startsWith('/api/') ? (
          <AuthedImage uri={customUrl} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )
      ) : (
        <LinearGradient
          colors={preset!.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.shine} pointerEvents="none" />
      <View style={styles.spine} pointerEvents="none" />
      <Text style={styles.title} numberOfLines={4}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.footerIcon}>📖</Text>
        <Text style={styles.footerLabel}>ESTUDIO</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderLeftWidth: 6,
    borderLeftColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  shine: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.15)',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    letterSpacing: 0.8,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingTop: 8,
    marginTop: 8,
  },
  footerIcon: { fontSize: 12, opacity: 0.85 },
  footerLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2 },
});
