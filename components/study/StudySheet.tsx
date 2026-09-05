import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

export interface StudyPalette {
  background: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
}

export function StudySheet({ title, reference, palette, onClose, onBack, backLabel = 'Volver', closeLabel = 'Cerrar', children, footer }: {
  title: string; reference: string; palette: StudyPalette; onClose: () => void; closeLabel?: string; children: ReactNode;
  onBack?: () => void; backLabel?: string; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="none" accessibilityLabel={`${title} · ${reference}`} onRequestClose={onBack ?? onClose}>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: palette.background,
        paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <View style={{ borderBottomWidth: 1, borderColor: palette.border }}>
          <View style={studyStyles.header}>
            {onBack ? <StudyButton label={backLabel} icon="arrow-left" quiet onPress={onBack} palette={palette} /> : null}
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>{title}</Text>
              <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 21 }}>{reference}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${closeLabel} estudio y volver a la Biblia`}
              onPress={onClose} style={({ pressed }) => [studyStyles.close, { backgroundColor: palette.card, opacity: pressed ? 0.6 : 1 }]}>
              <AppIcon name="close" color={palette.text} size={20} />
            </Pressable>
          </View>
        </View>
        {children}
        {footer ? <View style={{ borderTopWidth: 1, borderColor: palette.border }}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

export function StudyButton({ label, onPress, palette, selected, disabled, icon, quiet, expanded }: {
  label: string; onPress: () => void; palette: StudyPalette; selected?: boolean; disabled?: boolean;
  icon?: AppIconName; quiet?: boolean; expanded?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled, expanded }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [studyStyles.button, {
        borderColor: quiet ? 'transparent' : selected ? palette.accent : palette.border,
        backgroundColor: selected ? palette.accentSoft : quiet ? 'transparent' : palette.card,
        opacity: pressed || disabled ? 0.6 : 1,
      }]}>
      {icon ? <AppIcon name={icon} color={palette.text} size={18} /> : null}
      <Text style={{ color: palette.text, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function StudyFeedback({ loading, error, offlineAvailable, hasContent = true, palette, onRetry }: {
  loading: boolean; error?: string; offlineAvailable?: boolean; hasContent?: boolean; palette: StudyPalette; onRetry: () => void;
}) {
  if (loading) return <View style={studyStyles.feedback}>
    <ActivityIndicator accessibilityLabel="Cargando estudio" color={palette.accent} />
    <Text style={{ color: palette.muted, fontSize: 15, textAlign: 'center' }}>Cargando el contenido del pasaje…</Text>
  </View>;
  if (error) return (
    <View style={studyStyles.feedback}>
      <Text accessibilityRole="alert" style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>{error}</Text>
      <StudyButton label="Reintentar" onPress={onRetry} palette={palette} />
    </View>
  );
  return (
    <View style={[studyStyles.row, { paddingVertical: 4 }]}>
      <AppIcon name={offlineAvailable ? 'check' : 'info'} color={palette.muted} size={16} />
      <Text style={{ color: palette.muted, fontSize: 13, flex: 1 }}>
        {offlineAvailable ? hasContent ? 'Disponible sin conexión' : 'Última consulta guardada' : 'Consulta en línea; no se pudo guardar en este dispositivo.'}
      </Text>
      <StudyButton label="Actualizar" icon="sync" quiet onPress={onRetry} palette={palette} />
    </View>
  );
}

export function StudyFooter({ palette, onClose, source, children }: {
  palette: StudyPalette; onClose: () => void; source?: string; children?: ReactNode;
}) {
  return <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: palette.border, gap: 8 }}>
    {children}
    <View style={studyStyles.row}>
      <StudyButton label="Descargas" icon="download" quiet palette={palette} onPress={() => { onClose(); router.push('/downloads'); }} />
      <StudyButton label="Fuentes" icon="info" quiet palette={palette} onPress={() => { onClose(); router.push('/legal'); }} />
    </View>
    {source ? <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 19 }}>{source}</Text> : null}
  </View>;
}

export const studyReadingFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export const studyStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 760, width: '100%', alignSelf: 'center' },
  close: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 48, minWidth: 48, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  feedback: { padding: 20, gap: 16 },
  content: { padding: 20, paddingBottom: 32, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  card: { padding: 16, borderWidth: 1, borderRadius: 16, gap: 12 },
});
