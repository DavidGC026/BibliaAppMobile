import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { LEGAL_LAST_UPDATED, type LegalDoc } from '@/lib/legalDocs';

/** Cuerpo de un documento legal (usado en la pantalla y en el modal de aceptación). */
export function LegalDocContent({ doc }: { doc: LegalDoc }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{doc.title}</Text>
      <Text style={[styles.updated, { color: colors.textMuted }]}>
        Última actualización: {LEGAL_LAST_UPDATED}
      </Text>
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
          {section.paragraphs?.map((p, i) => (
            <Text key={`p-${i}`} style={[styles.paragraph, { color: colors.textMuted }]}>{p}</Text>
          ))}
          {section.bullets?.map((b, i) => (
            <View key={`b-${i}`} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
              <Text style={[styles.paragraph, styles.bulletText, { color: colors.textMuted }]}>{b}</Text>
            </View>
          ))}
          {section.after?.map((p, i) => (
            <Text key={`a-${i}`} style={[styles.paragraph, { color: colors.textMuted }]}>{p}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  title: { fontSize: 22, fontWeight: '800' },
  updated: { fontSize: 13, fontWeight: '600', marginTop: -10 },
  section: { gap: 8 },
  heading: { fontSize: 16, fontWeight: '800' },
  paragraph: { fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  bulletDot: { fontSize: 14, lineHeight: 21 },
  bulletText: { flex: 1 },
});
