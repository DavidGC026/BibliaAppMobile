import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import {
  DEVOTIONAL_EMOTIONS,
  emotionStyle,
  formatDevotionalDate,
  parseDevotionalContent,
} from '@/lib/devotional';
import { parseVerseReference } from '@/lib/verseRef';
import type { Devotional } from '@/lib/types';

export default function DevotionalReadScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const parsedId = Number(id);

  const [loading, setLoading] = useState(true);
  const [devotional, setDevotional] = useState<Devotional | null>(null);

  useEffect(() => {
    if (Number.isNaN(parsedId)) return;
    setLoading(true);
    api
      .listDevotionals()
      .then(({ devotionals }) => {
        const dev = devotionals.find((d) => d.id === parsedId);
        if (!dev) throw new Error('Entrada no encontrada');
        setDevotional(dev);
      })
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [parsedId]);

  const openVerse = () => {
    if (!devotional?.verseRef) return;
    const parsed = parseVerseReference(devotional.verseRef);
    if (!parsed) {
      Alert.alert('Pasaje no reconocido', 'Abre la Biblia y busca el versículo manualmente.');
      router.push({ pathname: '/(tabs)/bible', params: { mode: 'reader' } });
      return;
    }
    router.push({
      pathname: '/(tabs)/bible',
      params: {
        mode: 'reader',
        bookId: String(parsed.bookId),
        chapter: String(parsed.chapter),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!devotional) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Entrada no encontrada.</Text>
      </View>
    );
  }

  const content = parseDevotionalContent(devotional);
  const emotion = DEVOTIONAL_EMOTIONS.find((e) => e.name === devotional.emotion);
  const chip = emotion ? emotionStyle(emotion.name, colors) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Devocional',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 8 }}>
              <Pressable onPress={() => router.push(`/devotional/${devotional.id}`)}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Editar</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
      >
        <View style={styles.metaRow}>
          <View style={[styles.dateChip, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={colors.textMuted} size={14} />
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
              {formatDevotionalDate(devotional.createdAt)}
            </Text>
          </View>
          {chip ? (
            <View style={[styles.emotionChip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
              <Text style={{ fontSize: 14 }}>{chip.emoji}</Text>
              <Text style={{ color: chip.text, fontSize: 12, fontWeight: '700' }}>{chip.name}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[typography.h1, { color: colors.text, fontSize: 26 }]}>{devotional.title}</Text>

        {devotional.verseRef ? (
          <Pressable
            onPress={openVerse}
            style={[styles.verseChip, { borderColor: `${colors.primary}40`, backgroundColor: colors.primarySoft }]}
          >
            <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={colors.primary} size={16} />
            <Text style={{ color: colors.primary, fontWeight: '700', flex: 1 }}>{devotional.verseRef}</Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Ir al versículo →</Text>
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Reflexión</Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {content.reflection || 'Sin reflexión.'}
          </Text>
        </View>

        <View style={[styles.section, styles.applicationBox, { borderColor: `${colors.primary}25`, backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Aplicación práctica</Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {content.application || 'Sin aplicación definida.'}
          </Text>
        </View>

        {devotional.verseRef ? (
          <Button label="Ir al versículo en la Biblia" onPress={openVerse} fullWidth />
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  body: { fontSize: 16, lineHeight: 26 },
  applicationBox: { borderWidth: 1, borderRadius: 14, padding: 14 },
});
