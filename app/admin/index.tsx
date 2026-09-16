import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { ManagedUser } from '@/lib/types';

export default function AdminUsersScreen() {
  const { colors, typography, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const { user } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      setError(null);
      const { users: list } = await api.adminListUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) load();
    }, [isAdmin, load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  if (!isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>
          Se requieren permisos de administrador.
        </Text>
      </View>
    );
  }

  function confirmDelete(target: ManagedUser) {
    if (target.id === user?.id) {
      Alert.alert('Acción no permitida', 'No puedes eliminar tu propia cuenta de administrador.');
      return;
    }
    Alert.alert(
      'Eliminar usuario',
      `¿Eliminar a «${target.email}»? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.adminDeleteUser(target.id);
              setUsers((prev) => prev.filter((u) => u.id !== target.id));
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[typography.h1, { color: colors.text }]}>Gestión de usuarios</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Administra cuentas, roles y permisos de secciones.
      </Text>

      <Button label="Crear usuario" onPress={() => router.push('/admin/new')} fullWidth />

      <TextInput
        style={[
          styles.search,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, borderRadius: radius.lg },
        ]}
        placeholder="Buscar por nombre o correo…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        value={query}
        onChangeText={setQuery}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Card style={styles.card}>
          <Text style={{ color: colors.textMuted }}>{error}</Text>
          <Button label="Reintentar" variant="outline" onPress={() => load()} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={styles.card}>
          <Text style={{ color: colors.textMuted }}>
            Ningún usuario coincide con la búsqueda.
          </Text>
        </Card>
      ) : (
        filtered.map((u) => {
          const isSelf = u.id === user?.id;
          const isUserAdmin = u.role === 'admin';
          return (
            <Card key={u.id} style={styles.userCard}>
              <Pressable style={styles.userMain} onPress={() => router.push(`/admin/${u.id}`)}>
                <View style={styles.userHeader}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {u.name}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: isUserAdmin ? colors.primarySoft : colors.background,
                        borderColor: isUserAdmin ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isUserAdmin ? colors.primary : colors.textMuted,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {isUserAdmin ? 'Admin' : 'Lector'}
                      {isSelf ? ' · Tú' : ''}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {u.email}
                </Text>
                <Text style={[styles.userMeta, { color: colors.textMuted }]}>
                  Creado el {new Date(u.createdAt).toLocaleDateString()}
                </Text>
              </Pressable>
              <View style={[styles.userActions, { borderTopColor: colors.border }]}>
                <Pressable style={styles.actionButton} onPress={() => router.push(`/admin/${u.id}`)}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Editar</Text>
                </Pressable>
                <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  style={styles.actionButton}
                  disabled={isSelf}
                  onPress={() => confirmDelete(u)}
                >
                  <Text style={{ color: isSelf ? colors.textMuted : '#d64545', fontWeight: '700' }}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  content: { padding: 16, gap: 12 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: -6 },
  search: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  card: { gap: 12 },
  userCard: { padding: 0, overflow: 'hidden' },
  userMain: { padding: 14, gap: 3 },
  userHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  userName: { fontSize: 16, fontWeight: '800', flex: 1 },
  roleBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  userEmail: { fontSize: 13 },
  userMeta: { fontSize: 12 },
  userActions: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  actionButton: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  actionDivider: { width: StyleSheet.hairlineWidth },
});
