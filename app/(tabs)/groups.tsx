import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthedImage } from '@/components/AuthedImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GuestPrompt } from '@/components/GuestPrompt';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { GroupSummary } from '@/lib/types';

function GroupCard({ group }: { group: GroupSummary }) {
  const { colors, radius } = useAppTheme();

  return (
    <Card onPress={() => router.push(`/group/${group.id}`)} style={styles.card}>
      {group.cover_image ? (
        <AuthedImage uri={group.cover_image} style={styles.cover} />
      ) : null}
      <View style={styles.cardRow}>
        {group.avatar_image ? (
          <AuthedImage uri={group.avatar_image} style={[styles.avatar, { borderColor: colors.border }]} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { borderColor: colors.border, backgroundColor: colors.primarySoft }]}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{group.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: colors.text }]}>{group.name}</Text>
          {group.description ? (
            <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
              {group.description}
            </Text>
          ) : null}
          <Text style={[styles.meta, { color: colors.primary }]}>
            {group.member_count} miembros · {group.role}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function GroupsScreen() {
  const { colors, radius } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadGroups = async () => {
    try {
      setError(null);
      const { groups: list } = await api.listGroups();
      setGroups(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar grupos');
    }
  };

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    loadGroups().finally(() => setLoading(false));
  }, [authLoading, isGuest]);

  const joinGroup = async () => {
    const code = inviteCode.trim();
    if (!code) return;
    setJoining(true);
    try {
      const result = await api.joinGroupByCode(code);
      setInviteCode('');
      await loadGroups();
      if (result.alreadyMember) {
        Alert.alert('Ya eres miembro', 'Ya perteneces a este grupo.');
      } else {
        Alert.alert('¡Unido!', 'Te has unido al grupo correctamente.');
        router.push(`/group/${result.groupId}`);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Código inválido');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <GuestPrompt
        title="Grupos"
        message="Únete a células y ministerios iniciando sesión con tu cuenta."
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, { paddingBottom: contentPadding }]}
      data={groups}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            await loadGroups();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <Card style={styles.joinBox}>
          <Text style={[styles.joinTitle, { color: colors.text }]}>Unirse con código</Text>
          <TextInput
            style={[styles.joinInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.lg }]}
            placeholder="Código de invitación"
            placeholderTextColor={colors.textMuted}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />
          <Button
            label={joining ? 'Uniendo…' : 'Unirse al grupo'}
            onPress={joinGroup}
            disabled={joining || !inviteCode.trim()}
            loading={joining}
            fullWidth
          />
        </Card>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {error ?? 'Aún no perteneces a ningún grupo.'}
          </Text>
        )
      }
      renderItem={({ item }) => <GroupCard group={item} />}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  joinBox: { marginBottom: 16, gap: 10 },
  joinTitle: { fontSize: 16, fontWeight: '700' },
  joinInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  card: {
    overflow: 'hidden',
    marginBottom: 12,
    padding: 0,
  },
  cover: {
    width: '100%',
    height: 80,
  },
  cardRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
});
