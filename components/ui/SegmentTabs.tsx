import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

interface SegmentTabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}

export function SegmentTabs<T extends string>({ tabs, active, onChange }: SegmentTabsProps<T>) {
  const { colors, radius, shadow } = useAppTheme();

  return (
    <View style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[
          styles.wrap,
          shadow.sm,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        {tabs.map((tab) => {
          const selected = active === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                { borderRadius: radius.md },
                selected && { backgroundColor: colors.primarySoft },
              ]}
              onPress={() => onChange(tab.key)}
            >
              <Text
                style={{
                  color: selected ? colors.primary : colors.textMuted,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  // ponytail: horizontal ScrollView llena todo el alto del padre por defecto; flexGrow:0 lo limita al contenido.
  scroll: {
    flexGrow: 0,
  },
  wrap: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
