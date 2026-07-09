import { Stack, router, useLocalSearchParams } from 'expo-router';
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
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import { DEVOTIONAL_EMOTIONS, parseDevotionalContent } from '@/lib/devotional';

export default function DevotionalEditorScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const parsedId = isNew ? NaN : Number(id);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [verseRef, setVerseRef] = useState('');
  const [reflection, setReflection] = useState('');
  const [application, setApplication] = useState('');

  useEffect(() => {
    if (isNew || Number.isNaN(parsedId)) return;
    setLoading(true);
    api
      .listDevotionals()
      .then(({ devotionals }) => {
        const dev = devotionals.find((d) => d.id === parsedId);
        if (!dev) throw new Error('Entrada no encontrada');
        const content = parseDevotionalContent(dev);
        setTitle(dev.title);
        setEmotion(dev.emotion ?? null);
        setVerseRef(dev.verseRef ?? '');
        setReflection(content.reflection ?? '');
        setApplication(content.application ?? '');
      })
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isNew, parsedId]);

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Título requerido', 'Escribe un título para la entrada.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: trimmed,
        emotion,
        verseRef: verseRef.trim() || null,
        content: { reflection: reflection.trim(), application: application.trim() },
      };
      if (isNew) {
        await api.createDevotional(payload);
      } else {
        await api.updateDevotional(parsedId, payload);
      }
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (isNew) return;
    Alert.alert('Eliminar entrada', '¿Seguro que quieres eliminar esta entrada?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deleteDevotional(parsedId);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva entrada' : 'Diario espiritual',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 8 }}>
              {!isNew ? (
                <Pressable onPress={remove}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Borrar</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={save} disabled={saving}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{saving ? '…' : 'Guardar'}</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
      >
        <TextInput
          style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Título"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>¿Cómo te sientes?</Text>
        <View style={styles.emotions}>
          {DEVOTIONAL_EMOTIONS.map((e) => {
            const active = emotion === e.name;
            return (
              <Pressable
                key={e.name}
                style={[
                  styles.emotionChip,
                  { borderColor: colors.border, backgroundColor: active ? colors.primarySoft : colors.card },
                ]}
                onPress={() => setEmotion(active ? null : e.name)}
              >
                <Text style={{ fontSize: 16 }}>{e.emoji}</Text>
                <Text style={{ color: active ? colors.primary : colors.text, fontSize: 12, fontWeight: '700' }}>
                  {e.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>Versículo (opcional)</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Ej. Salmos 23:1"
          placeholderTextColor={colors.textMuted}
          value={verseRef}
          onChangeText={setVerseRef}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Reflexión</Text>
        <TextInput
          style={[styles.area, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="¿Qué Dios te mostró hoy?"
          placeholderTextColor={colors.textMuted}
          value={reflection}
          onChangeText={setReflection}
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Aplicación</Text>
        <TextInput
          style={[styles.area, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="¿Cómo lo aplicarás?"
          placeholderTextColor={colors.textMuted}
          value={application}
          onChangeText={setApplication}
          multiline
          textAlignVertical="top"
        />

        <Button label={saving ? 'Guardando…' : 'Guardar entrada'} onPress={save} disabled={saving} fullWidth />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  titleInput: { fontSize: 22, fontWeight: '800', borderBottomWidth: 1, paddingVertical: 10 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emotions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  area: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 120 },
});
