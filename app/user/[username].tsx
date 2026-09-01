import { Href, Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { FriendStatus, PublicProfile } from '@/lib/types';

function friendLabel(status: FriendStatus) {
  if (status === 'friends') return 'Ya son amigos';
  if (status === 'pending_sent') return 'Solicitud enviada';
  if (status === 'pending_received') return 'Aceptar solicitud';
  return 'Agregar amigo';
}

export default function UserProfileScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const { user } = useAuth();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username) return;
    const { profile: data } = await api.getPublicProfile(username);
    setProfile(data);
  }, [username]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : 'Perfil no encontrado'))
      .finally(() => setLoading(false));
  }, [load]);

  const isSelf = !!user && !!profile && user.id === profile.id;
  const handle = profile?.username ?? username;

  const toggleFollow = async () => {
    if (!handle) return;
    setBusy(true);
    try {
      if (profile?.isFollowing) await api.unfollowUser(handle);
      else await api.followUser(handle);
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  };

  const friendAction = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.friendStatus === 'pending_received') {
        await api.respondFriendRequest(profile.id, 'accept');
      } else if (profile.friendStatus === 'none') {
        await api.sendFriendRequest(profile.id);
      }
      await load();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: handle ? `@${handle}` : 'Perfil' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 16 }}
      >
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {profile ? (
          <Card style={{ gap: 12, alignItems: 'center' }}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '800' }}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[typography.h1, { color: colors.text, fontSize: 24 }]}>{profile.name}</Text>
            {profile.username ? (
              <Text style={{ color: colors.primary, fontWeight: '700' }}>@{profile.username}</Text>
            ) : null}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.followersCount}</Text>
                <Text style={{ color: colors.textMuted }}>Seguidores</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>{profile.followingCount}</Text>
                <Text style={{ color: colors.textMuted }}>Siguiendo</Text>
              </View>
            </View>
            {!isSelf ? (
              <View style={{ alignSelf: 'stretch', gap: 8 }}>
                <Button
                  label={profile.isFollowing ? 'Dejar de seguir' : 'Seguir'}
                  onPress={() => void toggleFollow()}
                  loading={busy}
                  fullWidth
                />
                <Button
                  label={friendLabel(profile.friendStatus)}
                  variant="outline"
                  onPress={() => void friendAction()}
                  disabled={profile.friendStatus === 'friends' || profile.friendStatus === 'pending_sent'}
                  loading={busy}
                  fullWidth
                />
              </View>
            ) : (
              <Button label="Mis amigos" variant="outline" onPress={() => router.push('/friends' as Href)} fullWidth />
            )}
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
});
