import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { DevotionalsPanel } from '@/components/notes/DevotionalsPanel';
import { NotebooksPanel } from '@/components/notes/NotebooksPanel';
import { StudyBooksPanel } from '@/components/notes/StudyBooksPanel';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { GuestPrompt } from '@/components/GuestPrompt';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';

type NotesSection = 'libretas' | 'diario' | 'libros';

const TABS: { key: NotesSection; label: string }[] = [
  { key: 'libretas', label: 'Notas' },
  { key: 'diario', label: 'Diario' },
  { key: 'libros', label: 'Biblioteca' },
];

export default function NotesScreen() {
  const { colors, typography } = useAppTheme();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [section, setSection] = useState<NotesSection>('libretas');

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <GuestPrompt
        title="Notas"
        message="Inicia sesión para escribir, organizar y sincronizar tus notas en todos tus dispositivos."
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <View style={styles.topHeader}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <SymbolView name={{ ios: 'note.text', android: 'edit_note', web: 'edit_note' }} tintColor={colors.primary} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, { color: colors.text, fontSize: 22 }]}>Notas</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Un espacio flexible para ideas, apuntes, investigación y lectura.
          </Text>
          <View style={{ marginTop: 6 }}>
            <SyncStatusBadge />
          </View>
        </View>
      </View>
      <SegmentTabs tabs={TABS} active={section} onChange={setSection} />
      {section === 'libretas' ? <NotebooksPanel /> : null}
      {section === 'diario' ? <DevotionalsPanel /> : null}
      {section === 'libros' ? <StudyBooksPanel /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topHeader: { paddingHorizontal: 16, paddingTop: 8, gap: 12, flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
