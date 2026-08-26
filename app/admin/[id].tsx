import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import type { AdminSectionGroup } from '@/lib/types';

function parseSections(raw: string | string[] | null): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function AdminUserFormScreen() {
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const { user: currentUser } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNew = id === 'new';
  const userId = isNew ? null : Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [sections, setSections] = useState<string[]>([]);
  const [groups, setGroups] = useState<AdminSectionGroup[]>([]);
  const [defaults, setDefaults] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sectionsRes, usersRes] = await Promise.all([
          api.adminListSections(),
          isNew ? Promise.resolve(null) : api.adminListUsers(),
        ]);
        if (cancelled) return;

        setGroups(sectionsRes.groups);
        setDefaults(sectionsRes.defaults);

        if (usersRes) {
          const target = usersRes.users.find((u) => u.id === userId);
          if (!target) {
            setError('Usuario no encontrado.');
            return;
          }
          setName(target.name);
          setEmail(target.email);
          setRole(target.role === 'admin' ? 'admin' : 'user');
          setSections(parseSections(target.allowedSections) ?? sectionsRes.defaults);
        } else {
          setSections(sectionsRes.defaults);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar datos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isNew, userId]);

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId],
    );
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Datos incompletos', 'El nombre y el correo son obligatorios.');
      return;
    }
    if (isNew && password.length < 6) {
      Alert.alert('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (role === 'user' && sections.length === 0) {
      Alert.alert('Permisos vacíos', 'Selecciona al menos una sección para el lector.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.length > 0 ? password : undefined,
        role,
        allowedSections: role === 'admin' ? null : sections,
      };
      if (isNew) {
        await api.adminCreateUser(payload);
      } else {
        await api.adminUpdateUser(userId!, payload);
      }
      router.back();
    } catch (err) {
      Alert.alert('Error al guardar', err instanceof Error ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  if (currentUser?.role !== 'admin') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Se requieren permisos de administrador.</Text>
      </View>
    );
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, borderRadius: radius.lg },
  ];

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'Crear usuario' : 'Editar usuario' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <Card style={{ gap: 12 }}>
            <Text style={{ color: colors.textMuted }}>{error}</Text>
            <Button label="Volver" variant="outline" onPress={() => router.back()} />
          </Card>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>NOMBRE COMPLETO</Text>
            <TextInput
              style={inputStyle}
              placeholder="Juan Pérez"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>CORREO ELECTRÓNICO</Text>
            <TextInput
              style={inputStyle}
              placeholder="juan@correo.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>
              {isNew ? 'CONTRASEÑA' : 'NUEVA CONTRASEÑA (VACÍO = CONSERVAR)'}
            </Text>
            <TextInput
              style={inputStyle}
              placeholder={isNew ? 'Mínimo 6 caracteres' : 'Dejar en blanco para no cambiar'}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>ROL DE ACCESO</Text>
            <View style={styles.roleRow}>
              {(
                [
                  ['user', 'Lector ordinario'],
                  ['admin', 'Administrador'],
                ] as const
              ).map(([value, label]) => {
                const active = role === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRole(value)}
                    style={[
                      styles.roleOption,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : colors.card,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.textMuted,
                        fontWeight: '700',
                        fontSize: 14,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {role === 'user' ? (
              <>
                <View style={styles.sectionsHeader}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    SECCIONES PERMITIDAS
                  </Text>
                  <Pressable onPress={() => setSections([...defaults])}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                      Restaurar predeterminadas
                    </Text>
                  </Pressable>
                </View>
                {groups.map((group) => (
                  <Card key={group.id} style={styles.groupCard}>
                    <Text style={[styles.groupLabel, { color: colors.text }]}>{group.label}</Text>
                    {group.sections.map((section) => {
                      const checked = sections.includes(section.id);
                      return (
                        <Pressable
                          key={section.id}
                          style={styles.sectionRow}
                          onPress={() => toggleSection(section.id)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: checked ? colors.primary : colors.border,
                                backgroundColor: checked ? colors.primary : 'transparent',
                              },
                            ]}
                          >
                            {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                          </View>
                          <Text style={[styles.sectionLabel, { color: colors.text }]}>
                            {section.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </Card>
                ))}
              </>
            ) : (
              <Text style={[styles.adminNote, { color: colors.textMuted }]}>
                Los administradores tienen acceso a todas las secciones.
              </Text>
            )}

            <Button
              label={isNew ? 'Crear usuario' : 'Guardar cambios'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  content: { padding: 16, gap: 10 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginTop: 6 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: {
    flex: 1,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  sectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  groupCard: { gap: 4 },
  groupLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { color: '#fff', fontWeight: '800', fontSize: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  adminNote: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
