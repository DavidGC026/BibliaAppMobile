import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { parseGroupJoinCode } from '@/lib/groupInvite';
import { savePendingGroupJoin } from '@/lib/pendingGroupJoin';
import type { GroupPreview } from '@/lib/types';

export default function JoinGroupScreen() {
  const { colors } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest, isLoading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = parseGroupJoinCode(String(params.code ?? '')) ?? '';

  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!code) {
      setError('Falta el código de invitación.');
      return;
    }
    const { group } = await api.previewGroupByCode(code);
    setPreview(group);
  }, [code]);

  useEffect(() => {
    if (authLoading) return;
    if (isGuest && code) void savePendingGroupJoin(code);
    setError(null);
    load().catch((err) => setError(err instanceof Error ? err.message : 'Grupo no encontrado'));
  }, [authLoading, isGuest, load, code]);

  const join = async () => {
    setJoining(true);
    try {
      const result = await api.joinGroupByCode(code);
      router.replace(`/group/${result.groupId}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo unir');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  }

  if (isGuest) {
    return (
      <>
        <Stack.Screen options={{ title: 'Unirse a un grupo' }} />
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 16 }}
        >
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          {!preview && !error ? <ActivityIndicator color={colors.primary} /> : null}
          {preview ? (
            <Card style={{ gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{preview.name}</Text>
              {preview.description ? (
                <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{preview.description}</Text>
              ) : null}
            </Card>
          ) : null}
          <Card style={{ gap: 12, alignItems: 'center', paddingVertical: 28 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Unirse al grupo</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
              Inicia sesión para aceptar la invitación. Al entrar te traemos de vuelta aquí.
            </Text>
            <Button
              label="Iniciar sesión"
              onPress={() => {
                const go = async () => {
                  if (code) await savePendingGroupJoin(code);
                  router.push('/login');
                };
                void go();
              }}
              fullWidth
            />
          </Card>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Unirse a un grupo' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 16 }}
      >
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {!preview && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {preview ? (
          <Card style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{preview.name}</Text>
            {preview.description ? (
              <Text style={{ color: colors.textMuted, lineHeight: 22 }}>{preview.description}</Text>
            ) : null}
            <Button label={joining ? 'Uniendo…' : 'Unirme al grupo'} onPress={() => void join()} loading={joining} fullWidth />
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}
