import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AuthedImage } from '@/components/AuthedImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { BookLog, ExternalBook } from '@/lib/types';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function StudyBookScreen() {
  const { colors } = useAppTheme();
  const contentPadding = useContentPadding();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const parsedId = isNew ? NaN : Number(id);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState<ExternalBook | null>(null);
  const [logs, setLogs] = useState<BookLog[]>([]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const [logOpen, setLogOpen] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logPages, setLogPages] = useState('');
  const [logChapter, setLogChapter] = useState('');
  const [logReflection, setLogReflection] = useState('');

  const loadBook = async () => {
    const data = await api.getExternalBook(parsedId);
    setBook(data.book);
    setLogs(data.logs);
  };

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    loadBook()
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isNew, parsedId]);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para la portada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setCoverImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const createBook = async () => {
    if (!title.trim() || !author.trim()) {
      Alert.alert('Datos incompletos', 'Título y autor son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const { id: newId } = await api.createExternalBook(title.trim(), author.trim(), coverImage);
      router.replace(`/study-book/${newId}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const removeBook = () => {
    Alert.alert('Eliminar libro', '¿Quitar este libro de tu biblioteca?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deleteExternalBook(parsedId);
          router.back();
        },
      },
    ]);
  };

  const saveLog = async () => {
    if (!logReflection.trim()) {
      Alert.alert('Reflexión requerida', 'Escribe qué aprendiste en esta lectura.');
      return;
    }
    setSaving(true);
    try {
      await api.addExternalBookLog(parsedId, {
        title: logTitle.trim() || undefined,
        pages_read: logPages.trim() || undefined,
        chapter: logChapter.trim() || undefined,
        reflection: logReflection.trim(),
      });
      setLogOpen(false);
      setLogTitle('');
      setLogPages('');
      setLogChapter('');
      setLogReflection('');
      await loadBook();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isNew) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nuevo libro' }} />
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
        >
          <Pressable style={[styles.coverPick, { borderColor: colors.border, backgroundColor: colors.cardMuted }]} onPress={pickCover}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImg} />
            ) : (
              <>
                <SymbolView name={{ ios: 'photo', android: 'image', web: 'image' }} tintColor={colors.textMuted} size={28} />
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>Subir portada</Text>
              </>
            )}
          </Pressable>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Título del libro"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Autor"
            placeholderTextColor={colors.textMuted}
            value={author}
            onChangeText={setAuthor}
          />
          <Button label={saving ? 'Guardando…' : 'Guardar libro'} onPress={createBook} disabled={saving} fullWidth />
        </ScrollView>
      </>
    );
  }

  if (!book) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: book.title,
          headerRight: () => (
            <Pressable onPress={removeBook} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Borrar</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: contentPadding }]}
      >
        <Card style={styles.bookHeader}>
          <View style={[styles.coverSmall, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
            {book.coverImage ? (
              <AuthedImage uri={book.coverImage} style={styles.coverImg} />
            ) : (
              <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={colors.textMuted} size={24} />
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{book.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>{book.author}</Text>
          </View>
        </Card>

        <View style={styles.logHeader}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Bitácora de lectura</Text>
          {!logOpen ? <Button label="+ Reflexión" onPress={() => setLogOpen(true)} /> : null}
        </View>

        {logOpen ? (
          <Card style={{ gap: 10 }}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Título de la sesión (opcional)"
              placeholderTextColor={colors.textMuted}
              value={logTitle}
              onChangeText={setLogTitle}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Páginas"
                placeholderTextColor={colors.textMuted}
                value={logPages}
                onChangeText={setLogPages}
              />
              <TextInput
                style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Capítulo"
                placeholderTextColor={colors.textMuted}
                value={logChapter}
                onChangeText={setLogChapter}
              />
            </View>
            <TextInput
              style={[styles.area, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="¿Qué aprendiste?"
              placeholderTextColor={colors.textMuted}
              value={logReflection}
              onChangeText={setLogReflection}
              multiline
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Cancelar" variant="outline" onPress={() => setLogOpen(false)} />
              <Button label={saving ? '…' : 'Guardar'} onPress={saveLog} disabled={saving} />
            </View>
          </Card>
        ) : null}

        {logs.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 24 }}>
            Aún no hay reflexiones para este libro.
          </Text>
        ) : (
          logs.map((log) => (
            <Card key={log.id} style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
                {log.title || 'Reflexión sin título'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(log.createdAt)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {log.chapter ? (
                  <Text style={[styles.badge, { backgroundColor: colors.primarySoft, color: colors.primary }]}>
                    Cap. {log.chapter}
                  </Text>
                ) : null}
                {log.pagesRead ? (
                  <Text style={[styles.badge, { backgroundColor: colors.primarySoft, color: colors.primary }]}>
                    Págs: {log.pagesRead}
                  </Text>
                ) : null}
              </View>
              {log.reflection ? (
                <Text style={{ color: colors.text, lineHeight: 22, fontSize: 14 }}>{log.reflection}</Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14 },
  coverPick: {
    width: 120,
    height: 180,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 6,
  },
  coverImg: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  area: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100 },
  bookHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  coverSmall: {
    width: 72,
    height: 108,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
