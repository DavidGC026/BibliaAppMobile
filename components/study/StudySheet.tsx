import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface StudyPalette {
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
}

export function StudySheet({ title, reference, palette, onClose, children }: {
  title: string; reference: string; palette: StudyPalette; onClose: () => void; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={[studyStyles.header, { borderColor: palette.border }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 22, fontWeight: '800' }}>{title}</Text>
            <Text style={{ color: palette.muted, fontSize: 15 }}>{reference}</Text>
          </View>
          <StudyButton label="Cerrar" onPress={onClose} palette={palette} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function StudyButton({ label, onPress, palette, selected, disabled }: {
  label: string; onPress: () => void; palette: StudyPalette; selected?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [studyStyles.button, {
        borderColor: selected ? palette.accent : palette.border,
        backgroundColor: selected ? palette.accentSoft : palette.card,
        opacity: pressed || disabled ? 0.6 : 1,
      }]}>
      <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function StudyFeedback({ loading, error, offlineAvailable, palette, onRetry }: {
  loading: boolean; error?: string; offlineAvailable?: boolean; palette: StudyPalette; onRetry: () => void;
}) {
  if (loading) return <View style={studyStyles.feedback}><ActivityIndicator accessibilityLabel="Cargando estudio" color={palette.accent} /></View>;
  if (error) return (
    <View style={studyStyles.feedback}>
      <Text accessibilityRole="alert" style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>{error}</Text>
      <StudyButton label="Reintentar" onPress={onRetry} palette={palette} />
    </View>
  );
  return (
    <View style={[studyStyles.row, { paddingHorizontal: 16, paddingVertical: 8 }]}>
      <Text style={{ color: palette.muted, fontSize: 13, flex: 1 }}>
        {offlineAvailable ? 'Disponible sin conexión' : 'Consulta en línea; no se pudo guardar en este dispositivo.'}
      </Text>
      <StudyButton label="Actualizar" onPress={onRetry} palette={palette} />
    </View>
  );
}

export const studyStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  button: { minHeight: 48, minWidth: 48, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  feedback: { padding: 20, gap: 16 },
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderWidth: 1, borderRadius: 16, gap: 12 },
});
