import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/AppIcon';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ChapterConnection } from '@/lib/repo';

interface ChapterConnectionsSheetProps {
  visible: boolean;
  /** Capítulo de partida, ya formateado: «Génesis 1». */
  title: string;
  /** `null` mientras se consulta. */
  connections: ChapterConnection[] | null;
  error: string | null;
  /** El nombre del libro lo resuelve quien tiene el catálogo. */
  labelFor: (connection: ChapterConnection) => string;
  onOpenChapter: (bookId: number, chapter: number) => void;
  onOpenSource: () => void;
  onClose: () => void;
}

/**
 * Lista los capítulos conectados con el seleccionado en el mapa y deja abrir
 * cualquiera en el lector. Solo pinta: no consulta nada ni sabe de dónde
 * salen los datos.
 */
export function ChapterConnectionsSheet({
  visible,
  title,
  connections,
  error,
  labelFor,
  onOpenChapter,
  onOpenSource,
  onClose,
}: ChapterConnectionsSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const total = connections?.length ?? 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View style={styles.grabber}>
          <View style={[styles.grabberBar, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {connections === null
                ? 'Buscando conexiones…'
                : total === 0
                  ? 'Sin capítulos conectados'
                  : `${total} ${total === 1 ? 'capítulo conectado' : 'capítulos conectados'}`}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onOpenSource}
          style={({ pressed }) => [
            styles.sourceBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <AppIcon name="bible" size={16} color={colors.primary} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13, flex: 1 }}>
            Leer {title}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
        </Pressable>

        {connections === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 28 }} />
        ) : (
          <FlatList
            data={connections}
            keyExtractor={(item) => String(item.key)}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                {error ?? 'Este capítulo no comparte referencias con ningún otro.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onOpenChapter(item.bookId, item.chapter)}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {labelFor(item)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {item.refs} {item.refs === 1 ? 'referencia' : 'referencias'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '78%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
  },
  grabber: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  grabberBar: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  title: { fontSize: 17, fontWeight: '800' },
  sourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  list: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  empty: { textAlign: 'center', marginVertical: 24, paddingHorizontal: 16, lineHeight: 20 },
});
