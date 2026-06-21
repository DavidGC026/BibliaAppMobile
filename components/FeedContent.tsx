import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthedImage } from '@/components/AuthedImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { openAuthedFile } from '@/lib/openMedia';
import { parseFeedContent } from '@/lib/media';

interface FeedContentProps {
  content: string;
}

export function FeedContent({ content }: FeedContentProps) {
  const colors = useThemeColors();
  const blocks = parseFeedContent(content);

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        if (block.type === 'image') {
          return (
            <AuthedImage
              key={i}
              uri={block.url}
              style={[styles.image, { borderColor: colors.border }]}
              resizeMode="cover"
            />
          );
        }
        if (block.type === 'file') {
          return (
            <Pressable
              key={i}
              style={[styles.fileBtn, { borderColor: colors.border, backgroundColor: colors.primarySoft }]}
              onPress={() => openAuthedFile(block.url, block.label).catch(() => {})}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>📄 {block.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Toca para abrir</Text>
            </Pressable>
          );
        }
        if (!block.text.trim()) return null;
        return (
          <Text key={i} style={[styles.text, { color: colors.text }]}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  text: { fontSize: 16, lineHeight: 24 },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
});
