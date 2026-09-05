import { Href, router } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { LegalLinksFooter } from '@/components/LegalLinksFooter';
import { OfflineStatusBadge } from '@/components/OfflineStatusBadge';
import { ReminderSettings } from '@/components/ReminderSettings';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { androidWidgetAvailable } from '@/hooks/useAppReminders';
import { LEGAL_URLS } from '@/lib/config';
import * as api from '@/lib/api';

function MenuRow({
  icon,
  label,
  onPress,
  right,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}>
        <AppIcon name={icon} color={colors.primary} size={20} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {right}
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
        <Card style={styles.menuCard}>
          <MenuRow icon="trophy" label="Juegos bíblicos" onPress={() => router.push('/games')} />
        </Card>
        <ThemeSwitch />
        <Card style={styles.menuCard}>
          <MenuRow
            icon="info"
            label="Información legal y licencias"
            onPress={() => router.push('/legal')}
          />
        </Card>
        <LegalLinksFooter />
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
          <MenuRow icon="trophy" label="Juegos bíblicos" onPress={() => router.push('/games')} />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="download"
            label="Descargas offline"
            onPress={() => router.push('/downloads')}
            right={<OfflineStatusBadge compact />}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="highlighter"
            label="Subrayados"
            onPress={() => router.push('/highlights')}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="star"
            label="Favoritos"
            onPress={() => router.push('/favorites')}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="settings"
            label="Personalizar accesos rápidos"
            onPress={() => router.push('/customize-home')}
          />
        </Card>
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.menuHeading, { color: colors.textMuted }]}>COMUNIDAD</Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="community"
            label="Amigos y seguir"
            onPress={() => router.push('/friends' as Href)}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="groups"
            label="Discipulado"
            onPress={() => router.push('/discipleship' as Href)}
          />
        </Card>
      </View>

      <ThemeSwitch isAdmin={user?.role === 'admin'} />
      <ReminderSettings />

      {user?.role === 'admin' ? (
        <View style={styles.menuSection}>
          <Text style={[styles.menuHeading, { color: colors.textMuted }]}>ADMINISTRACIÓN</Text>
          <Card style={styles.menuCard}>
            <MenuRow
              icon="groups"
              label="Gestión de usuarios"
              onPress={() => router.push('/admin')}
            />
          </Card>
        </View>
      ) : null}

      <View style={styles.menuSection}>
        <Text style={[styles.menuHeading, { color: colors.textMuted }]}>PRIVACIDAD Y SEGURIDAD</Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="profile"
            label="Usuarios bloqueados"
            onPress={async () => {
              try {
                const { blockedUsers } = await api.getBlockedUsers();
                if (blockedUsers.length === 0) {
                  Alert.alert('Usuarios bloqueados', 'No tienes usuarios bloqueados.');
                  return;
                }
                const first = blockedUsers[0];
                Alert.alert(
                  'Usuarios bloqueados',
                  `Tienes ${blockedUsers.length} usuario(s) bloqueado(s).\n\nEjemplo: ${first.name} (@${first.username})`,
                  [
                    {
                      text: `Desbloquear a ${first.name}`,
                      onPress: async () => {
                        await api.unblockUser(first.id);
                        Alert.alert('Éxito', `${first.name} ha sido desbloqueado.`);
                      },
                    },
                    { text: 'Cerrar', style: 'cancel' },
                  ],
                );
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Error al obtener bloqueados');
              }
            }}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuRow
            icon="delete"
            label="Eliminar mi cuenta definitivamente"
            onPress={() => {
              Alert.alert(
                'Eliminar cuenta',
                '¿Estás seguro de que deseas eliminar tu cuenta permanentemente? Esta acción es irreversible y eliminará todos tus datos.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar definitivamente',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.deleteMyAccount();
                        Alert.alert('Cuenta eliminada', 'Tu cuenta ha sido eliminada.');
                        logout();
                      } catch (e) {
                        Alert.alert('Error', e instanceof Error ? e.message : 'Error al eliminar cuenta');
                      }
                    },
                  },
                ],
              );
            }}
          />
        </Card>
      </View>

      <View style={styles.menuSection}>
        <Text style={[styles.menuHeading, { color: colors.textMuted }]}>LEGAL Y AYUDA</Text>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="info"
            label="Información legal y licencias"
            onPress={() => router.push('/legal')}
          />
          {LEGAL_URLS.accountDeletion ? (
            <>
              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
              <MenuRow
                icon="profile"
                label="Solicitar eliminación de cuenta (Web)"
                onPress={() => Linking.openURL(LEGAL_URLS.accountDeletion!)}
              />
            </>
          ) : null}
        </Card>
      </View>

      {androidWidgetAvailable() ? (
        <Card style={styles.widgetHint}>
          <Text style={[styles.widgetTitle, { color: colors.text }]}>Widget en Android</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
            Mantén pulsado el escritorio → Widgets → BibliaAPP → Versículo del día. Se actualiza al abrir la app.
          </Text>
        </Card>
      ) : null}

      <Button label="Cerrar sesión" variant="outline" onPress={() => logout()} fullWidth />
      <LegalLinksFooter />
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
