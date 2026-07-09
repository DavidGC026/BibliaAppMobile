import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useContentPadding } from '@/hooks/useContentPadding';
import { repoGetCrossReferences } from '@/lib/repo';
import type { CrossReference } from '@/lib/types';

interface CrossReferencesModalProps {
  visible: boolean;
  bibleId: number;
  bookId: number | null;
  chapter: number;
  verse: number | null;
  reference: string;
  onClose: () => void;
  onOpenReference?: (bookId: number, chapter: number) => void;
}

export function CrossReferencesModal({
  visible,
  bibleId,
  bookId,
  chapter,
  verse,
  reference,
  onClose,
  onOpenReference,
}: CrossReferencesModalProps) {
  const colors = useThemeColors();
  const contentPadding = useContentPadding();
  const [refs, setRefs] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !bookId || verse === null) return;
    setLoading(true);
    setError(null);
    repoGetCrossReferences(bibleId, bookId, chapter, verse)
      .then(({ references }) => setRefs(references))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [visible, bibleId, bookId, chapter, verse]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Referencias cruzadas</Text>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{reference}</Text>
          </View>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cerrar</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={refs}
            keyExtractor={(item, i) => `${item.book_id}-${item.chapter}-${item.verse}-${i}`}
            contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {error ?? 'No hay referencias cruzadas para este versículo.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (onOpenReference) {
                    onOpenReference(item.book_id, item.chapter);
                    onClose();
                  }
                }}
              >
                <Text style={[styles.refTitle, { color: colors.primary }]}>
                  {item.book_name} {item.chapter}:{item.verse}
                </Text>
                <Text style={{ color: colors.text, lineHeight: 22 }}>{item.text}</Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  list: { padding: 16, flexGrow: 1 },
  refCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, gap: 6 },
  refTitle: { fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
});
