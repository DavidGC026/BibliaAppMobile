import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GuestPrompt } from '@/components/GuestPrompt';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { DiscipleProgress, DiscipleshipRelation } from '@/lib/types';

export default function DiscipleshipScreen() {
  const { colors, radius, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const { isGuest } = useAuth();
  const [asMentor, setAsMentor] = useState<DiscipleshipRelation[]>([]);
  const [asDisciple, setAsDisciple] = useState<DiscipleshipRelation[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [progressId, setProgressId] = useState<number | null>(null);
  const [progress, setProgress] = useState<DiscipleProgress | null>(null);

  const load = useCallback(async () => {
    const data = await api.listDiscipleship();
    setAsMentor(data.asMentor);
    setAsDisciple(data.asDisciple);
  }, []);

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load()
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isGuest, load]);

  const requestMentor = async () => {
    const handle = username.replace(/^@/, '').trim();
    if (!handle) return;
    setSubmitting(true);
    try {
      await api.requestDiscipleship(handle);
      setUsername('');
      await load();
      Alert.alert('Solicitud enviada', 'El mentor recibirá una notificación.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (id: number, accept: boolean) => {
    await api.respondDiscipleship(id, accept);
    await load();
  };

  const openProgress = async (partnerId: number) => {
    setProgressId(partnerId);
    try {
      const { progress: data } = await api.getDiscipleProgress(partnerId);
      setProgress(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar el progreso');
      setProgressId(null);
    }
  };

  const pending = asMentor.filter((r) => r.status === 'pending');
  const activeMentoring = asMentor.filter((r) => r.status === 'active');

  if (isGuest) {
    return (
      <>
        <Stack.Screen options={{ title: 'Discipulado' }} />
        <GuestPrompt title="Discipulado" message="Inicia sesión para solicitar un mentor o responder solicitudes." />
      </>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: contentPadding, gap: 16 }}
    >
      <Stack.Screen options={{ title: 'Discipulado' }} />
      <Text style={[typography.h1, { color: colors.text, fontSize: 24 }]}>Discipulado</Text>
      <Text style={{ color: colors.textMuted, lineHeight: 22 }}>Acompañamiento espiritual de uno a uno.</Text>

      <Card style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>Solicitar un mentor</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
          placeholder="@usuario del mentor"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <Button label="Enviar solicitud" onPress={() => void requestMentor()} loading={submitting} disabled={!username.trim()} fullWidth />
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {pending.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontWeight: '800' }}>SOLICITUDES PARA TI</Text>
          {pending.map((r) => (
            <Card key={r.id} style={{ gap: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{r.partner_name}</Text>
              {r.partner_username ? <Text style={{ color: colors.primary }}>@{r.partner_username}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Aceptar" onPress={() => void respond(r.id, true)} />
                <Button label="Rechazar" variant="outline" onPress={() => void respond(r.id, false)} />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontWeight: '800' }}>TUS DISCÍPULOS</Text>
        {activeMentoring.length === 0 ? (
          <EmptyState title="Nadie bajo tu mentoría" message="Cuando aceptes una solicitud, verás aquí su progreso." />
        ) : (
          activeMentoring.map((r) => (
            <Card key={r.id} style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{r.partner_name}</Text>
              <Button label="Ver progreso" variant="outline" onPress={() => void openProgress(r.partner_id)} />
              {progressId === r.partner_id && progress ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Racha: {progress.streak_count} días</Text>
                  {progress.reading_plans.map((p) => (
                    <Text key={p.plan_id} style={{ color: colors.textMuted }}>
                      Plan: {p.name}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontWeight: '800' }}>TU MENTOR</Text>
        {asDisciple.length === 0 ? (
          <EmptyState title="Sin mentor todavía" message="Pide acompañamiento con el @usuario de quien te guía." />
        ) : (
          asDisciple.map((r) => (
            <Card key={r.id}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{r.partner_name}</Text>
              <Text style={{ color: colors.textMuted, textTransform: 'capitalize' }}>{r.status}</Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
