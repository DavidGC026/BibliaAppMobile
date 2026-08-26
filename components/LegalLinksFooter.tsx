import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

const links = [
  ['Términos', '/legal-doc/terminos'],
  ['Privacidad', '/legal-doc/privacidad'],
  ['Normas de la comunidad', '/legal-doc/normas-comunidad'],
] as const;

/** Enlaces legales en pequeño, siempre visibles en Perfil. */
export function LegalLinksFooter() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      {links.map(([label, path], index) => (
        <Text key={label} style={[styles.item, { color: colors.textMuted }]}>
          {index > 0 ? '·  ' : ''}
          <Text
            style={[styles.link, { color: colors.textMuted }]}
            onPress={() => router.push(path)}
            suppressHighlighting
          >
            {label}
          </Text>
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  item: { fontSize: 12, lineHeight: 18 },
  link: { fontWeight: '600', textDecorationLine: 'underline' },
});
