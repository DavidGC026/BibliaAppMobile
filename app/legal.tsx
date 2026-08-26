import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { APP_VARIANT, LEGAL_URLS } from '@/lib/config';
import type { BibleVersion } from '@/lib/types';

const docLinks = [
  ['Términos y condiciones', 'terminos'],
  ['Aviso de privacidad', 'privacidad'],
  ['Normas de la comunidad', 'normas-comunidad'],
] as const;

const externalLinks = [
  ['Soporte', LEGAL_URLS.support],
  ['Solicitar eliminación de cuenta', LEGAL_URLS.accountDeletion],
] as const;

export default function LegalScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const [bibles, setBibles] = useState<BibleVersion[]>([]);

  useEffect(() => {
    api.listBibles().then((response) => setBibles(response.bibles)).catch(() => {});
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
    >
      <Text style={[typography.h1, { color: colors.text }]}>Información legal</Text>
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>BibliaAPP</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}> 
          Aplicación cristiana sin fines de lucro creada para facilitar la lectura, el estudio y la
          reflexión de las Escrituras. No vende el texto bíblico ni condiciona su lectura a pagos.
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>Variante: {APP_VARIANT}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Políticas y ayuda</Text>
        {docLinks.map(([label, slug]) => (
          <Pressable
            key={slug}
            onPress={() => router.push(`/legal-doc/${slug}`)}
            style={styles.linkRow}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
        {externalLinks.map(([label, url]) => (
          url ? (
            <Pressable key={label} onPress={() => Linking.openURL(url)} style={styles.linkRow}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{label}</Text>
              <Text style={{ color: colors.textMuted }}>↗</Text>
            </Pressable>
          ) : APP_VARIANT === 'internal' ? (
            <View key={label} style={styles.linkRow}>
              <Text style={{ color: colors.textMuted }}>{label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>pendiente</Text>
            </View>
          ) : null
        ))}
      </Card>

      <Text style={[typography.h2, { color: colors.text }]}>Traducciones disponibles</Text>
      {bibles.map((bible) => (
        <Card key={bible.bibleId} style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>{bible.name} ({bible.abbr})</Text>
          {bible.copyright ? <Text style={[styles.body, { color: colors.textMuted }]}>{bible.copyright}</Text> : null}
          {bible.attribution ? <Text style={[styles.body, { color: colors.textMuted }]}>{bible.attribution}</Text> : null}
          {bible.license ? <Text style={[styles.meta, { color: colors.textMuted }]}>Licencia: {bible.license}</Text> : null}
          {bible.sourceUrl ? (
            <Pressable onPress={() => Linking.openURL(bible.sourceUrl!)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Fuente y licencia ↗</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  card: { gap: 10 },
  title: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  meta: { fontSize: 12, fontWeight: '600' },
  linkRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
