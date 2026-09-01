import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentTabs } from '@/components/ui/SegmentTabs';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { GroupSummary, UserPrayer } from '@/lib/types';

type Filter = 'active' | 'answered' | 'archived';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'active', label: 'Activas' },
  { key: 'answered', label: 'Respondidas' },
  { key: 'archived', label: 'Archivo' },
];

export function PrayersPanel() {
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const [prayers, setPrayers] = useState<UserPrayer[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'group'>('private');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ prayers: list }, { groups: groupList }] = await Promise.all([
      api.listMyPrayers(),
      api.listGroups().catch(() => ({ groups: [] as GroupSummary[] })),
    ]);
    setPrayers(list);
    setGroups(groupList);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = prayers.filter((p) => p.status === filter);

  const submit = async () => {
    if (!title.trim()) return;
    if (visibility === 'group' && !groupId) {
      Alert.alert('Grupo', 'Elige un grupo para compartir la petición.');
      return;
    }
    setSaving(true);
    try {
      await api.createPrayer({
        title: title.trim(),
        description: description.trim(),
        visibility,
        groupId: visibility === 'group' ? groupId : null,
      });
      setTitle('');
      setDescription('');
      setVisibility('private');
      setGroupId(null);
      setCreating(false);
      setFilter('active');
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    try {
      await api.updatePrayerStatus(id, status);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  const remove = (item: UserPrayer) => {
    Alert.alert('Eliminar petición', `¿Quitar «${item.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deletePrayer(item.id);
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 12 }}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            await load().finally(() => setRefreshing(false));
          }}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Button
            label={creating ? 'Cancelar' : 'Nueva petición'}
            variant={creating ? 'outline' : 'primary'}
            onPress={() => setCreating((v) => !v)}
            fullWidth
          />
          {creating ? (
            <Card style={{ gap: 10 }}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder="Título"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.input, styles.area, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder="Detalle (opcional)"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <View style={styles.row}>
                <Pressable
                  onPress={() => setVisibility('private')}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: visibility === 'private' ? colors.primarySoft : 'transparent' },
                  ]}
                >
                  <Text style={{ color: visibility === 'private' ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                    Privada
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setVisibility('group')}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: visibility === 'group' ? colors.primarySoft : 'transparent' },
                  ]}
                >
                  <Text style={{ color: visibility === 'group' ? colors.primary : colors.textMuted, fontWeight: '700' }}>
                    Con un grupo
                  </Text>
                </Pressable>
              </View>
              {visibility === 'group' ? (
                groups.length === 0 ? (
                  <Text style={{ color: colors.textMuted }}>Únete a un grupo para compartir peticiones.</Text>
                ) : (
                  <View style={styles.row}>
                    {groups.map((g) => (
                      <Pressable
                        key={g.id}
                        onPress={() => setGroupId(g.id)}
                        style={[
                          styles.chip,
                          { borderColor: colors.border, backgroundColor: groupId === g.id ? colors.primarySoft : 'transparent' },
                        ]}
                      >
                        <Text style={{ color: groupId === g.id ? colors.primary : colors.text, fontWeight: '600' }}>{g.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )
              ) : null}
              <Button label="Guardar" onPress={() => void submit()} loading={saving} disabled={!title.trim()} fullWidth />
            </Card>
          ) : null}
          <SegmentTabs tabs={FILTERS} active={filter} onChange={setFilter} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title={filter === 'active' ? 'No hay peticiones activas' : 'Nada en esta lista'}
          message="Escribe una petición privada o compártela con tu grupo."
        />
      }
      renderItem={({ item }) => (
        <Card style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{item.title}</Text>
          {item.description ? (
            <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{item.description}</Text>
          ) : null}
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
            {item.visibility === 'group' ? 'Compartida con un grupo' : 'Privada'}
          </Text>
          <View style={styles.row}>
            {item.status === 'active' ? (
              <Button label="Respondida" variant="outline" onPress={() => void setStatus(item.id, 'answered')} />
            ) : null}
            {item.status !== 'archived' ? (
              <Button label="Archivar" variant="ghost" onPress={() => void setStatus(item.id, 'archived')} />
            ) : null}
            <Button label="Eliminar" variant="ghost" onPress={() => remove(item)} />
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  area: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 999 },
});
