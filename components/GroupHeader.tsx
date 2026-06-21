import { StyleSheet, Text, View } from 'react-native';

import { AuthedImage } from '@/components/AuthedImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { GroupSummary } from '@/lib/types';

interface GroupHeaderProps {
  group: GroupSummary;
}

export function GroupHeader({ group }: GroupHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.coverWrap}>
        {group.cover_image ? (
          <AuthedImage uri={group.cover_image} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback, { backgroundColor: colors.primarySoft }]} />
        )}
        <View style={styles.avatarWrap}>
          {group.avatar_image ? (
            <AuthedImage uri={group.avatar_image} style={[styles.avatar, { borderColor: colors.card }]} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { borderColor: colors.card, backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>
                {group.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>{group.name}</Text>
        {group.description ? (
          <Text style={[styles.desc, { color: colors.textMuted }]}>{group.description}</Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.primary }]}>
          {group.member_count} miembros · {group.role}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1 },
  coverWrap: { position: 'relative' },
  cover: { width: '100%', height: 140 },
  coverFallback: {},
  avatarWrap: {
    position: 'absolute',
    bottom: -36,
    left: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 4,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { paddingTop: 44, paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 13, fontWeight: '600' },
});
