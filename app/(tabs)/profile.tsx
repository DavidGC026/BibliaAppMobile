import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { androidWidgetAvailable } from '@/hooks/useAppReminders';

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}>
        <SymbolView name={icon} tintColor={colors.primary} size={20} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const { user, isGuest, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingBottom: contentPadding }]}
      >
        <Text style={[typography.h1, { color: colors.text }]}>Perfil</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Inicia sesión para ver tu perfil y configuración.
        </Text>
        <Button label="Entrar" onPress={() => router.push('/login')} />
        <ThemeSwitch />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: contentPadding }]}
    >
      <Text style={[typography.h1, { color: colors.text }]}>Perfil</Text>

      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
        {user?.username ? (
          <Text style={[styles.username, { color: colors.primary }]}>@{user.username}</Text>
        ) : null}
        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaValue, { color: colors.text }]}>{user?.role}</Text>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Rol</Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaItem}>
            <Text style={[styles.metaValue, { color: colors.primary }]}>{user?.streakCount ?? 0}</Text>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Racha (días)</Text>
          </View>
        </View>
      </Card>

      <View style={styles.menuSection}>
        <Text style={[styles.menuHeading, { color: colors.textMuted }]}>MI BIBLIA</Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon={{ ios: 'arrow.down.circle.fill', android: 'download', web: 'download' }}
            label="Descargas offline"
            onPress={() => router.push('/downloads')}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon={{ ios: 'highlighter', android: 'border_color', web: 'border_color' }}
            label="Subrayados"
            onPress={() => router.push('/highlights')}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon={{ ios: 'star.fill', android: 'star', web: 'star' }}
            label="Favoritos"
            onPress={() => router.push('/favorites')}
          />
        </Card>
      </View>

      <ThemeSwitch />

      {androidWidgetAvailable() ? (
        <Card style={styles.widgetHint}>
          <Text style={[styles.widgetTitle, { color: colors.text }]}>Widget en Android</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
            Mantén pulsado el escritorio → Widgets → BibliaAPP → Versículo del día. Se actualiza al abrir la app.
          </Text>
        </Card>
      ) : null}

      <Button label="Cerrar sesión" variant="outline" onPress={() => logout()} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 16 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  profileCard: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 28, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 15 },
  username: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    width: '100%',
    justifyContent: 'center',
    gap: 24,
  },
  metaItem: { alignItems: 'center', gap: 2 },
  metaValue: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  metaLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaDivider: { width: 1, height: 36 },
  menuSection: { gap: 8 },
  menuHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginLeft: 4 },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  widgetHint: { gap: 6 },
  widgetTitle: { fontSize: 15, fontWeight: '700' },
});
