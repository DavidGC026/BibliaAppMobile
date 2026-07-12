import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { dismissOnboarding, isOnboardingDismissed } from '@/lib/onboardingState';

const STEPS: { icon: SymbolViewProps['name']; title: string; description: string; route: string; params?: Record<string, string> }[] = [
  {
    icon: { ios: 'arrow.down.circle.fill', android: 'download', web: 'download' },
    title: 'Descarga tu Biblia',
    description: 'Léela sin conexión donde estés.',
    route: '/downloads',
  },
  {
    icon: { ios: 'magnifyingglass', android: 'search', web: 'search' },
    title: 'Busca en toda la app',
    description: 'Versículos, notas, devocionales y diccionario.',
    route: '/search',
  },
  {
    icon: { ios: 'note.text', android: 'edit_note', web: 'edit_note' },
    title: 'Toma notas',
    description: 'Libretas para estudio o cualquier apunte.',
    route: '/(tabs)/notes',
  },
  {
    icon: { ios: 'photo.fill', android: 'image', web: 'image' },
    title: 'Crea imágenes de versículos',
    description: 'Selecciona un versículo en el lector y compártelo.',
    route: '/(tabs)/bible',
    params: { mode: 'reader' },
  },
];

/** Tarjeta descartable de primeros pasos para Inicio; desaparece al omitirla. */
export function OnboardingCard() {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    isOnboardingDismissed().then((dismissed) => setVisible(!dismissed));
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    dismissOnboarding().catch(() => {});
  };

  return (
    <Card style={[styles.card, { borderColor: colors.primaryBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Primeros pasos</Text>
        <Pressable onPress={dismiss} hitSlop={8}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>Omitir</Text>
        </Pressable>
      </View>
      {STEPS.map((step) => (
        <Pressable
          key={step.title}
          style={styles.row}
          onPress={() => router.push({ pathname: step.route as never, params: step.params })}
        >
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <SymbolView name={step.icon} tintColor={colors.primary} size={17} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{step.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16 }}>{step.description}</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 16 }}>›</Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
