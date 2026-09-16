import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LegalDocContent } from '@/components/LegalDocContent';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { LEGAL_DOCS, type LegalDocSlug } from '@/lib/legalDocs';

export default function LegalDocScreen() {
  const { colors } = useAppTheme();
  const contentPadding = useContentPadding();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const doc = LEGAL_DOCS[slug as LegalDocSlug];

  if (!doc) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Documento no encontrado.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: doc.shortTitle }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
      >
        <LegalDocContent doc={doc} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
});
