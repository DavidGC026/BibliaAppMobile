import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import { FontSelectorModal } from '@/components/FontSelectorModal';
import { InsertDictionaryModal } from '@/components/InsertDictionaryModal';
import { InsertVerseModal } from '@/components/InsertVerseModal';
import { NoteContent } from '@/components/NoteContent';
import { useNetwork } from '@/context/NetworkContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import * as repo from '@/lib/repo';
import { formatDictionaryInsertion } from '@/lib/dictionaryInsert';
import { getEditorHtml } from '@/lib/editorHtml';
import { getDownloadedFonts } from '@/lib/fontManager';
import type { StrongEntry } from '@/lib/types';

const FAVORITE_COLORS_KEY = 'NOTE_FAVORITE_COLORS';
const DEFAULT_COLORS = [
  '#3D3835',
  '#E7E5E4',
  '#92700C',
  '#E8B84A',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
];

function noteHasText(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

export default function NoteEditorScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { isOnline } = useNetwork();
  const { noteId, notebookId } = useLocalSearchParams<{ noteId: string; notebookId?: string }>();
  const isNew = noteId === 'new';
  const parsedNotebookId = notebookId ? Number(notebookId) : NaN;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [preview, setPreview] = useState(false);
  const [verseModalOpen, setVerseModalOpen] = useState(false);
  const [dictionaryModalOpen, setDictionaryModalOpen] = useState(false);
  const [fontModalOpen, setFontModalOpen] = useState(false);

  // Formatting state
  const [activeFont, setActiveFont] = useState('Default');
  const [favoriteColors, setFavoriteColors] = useState<string[]>(DEFAULT_COLORS);

  // Custom font base64 mappings for offline support
  const [base64Fonts, setBase64Fonts] = useState<Record<string, string>>({});
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Edge-to-edge (Expo SDK 56): empujar el editor sobre el teclado manualmente.
  const keyboardHeight = useKeyboardHeight();

  const insets = useSafeAreaInsets();

  const webViewRef = useRef<WebView>(null);
  const initialContentRef = useRef<string>('');
  const initialTitleRef = useRef('');
  const initialHtmlRef = useRef<string | null>(null);
  const saveFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevKeyboardHeightRef = useRef(0);
  const saveHtmlPendingRef = useRef(false);
  const commitSaveRef = useRef(false);
  const leaveAfterSaveRef = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const autoLeavingRef = useRef(false);
  // Id real de una nota nueva tras el primer autoguardado: los siguientes
  // guardados deben actualizarla, no crear otra.
  const createdIdRef = useRef<number | null>(null);
  const saveFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helper: send action to WebView via injectJavaScript ──
  const sendToEditor = (action: Record<string, any>) => {
    const js = `window.handleAction(${JSON.stringify(JSON.stringify(action))});true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  // Scroll caret when keyboard opens; blur editor on Android when it closes (back button).
  useEffect(() => {
    if (preview) return;
    sendToEditor({ type: 'setKeyboardInset', value: keyboardHeight });
    if (
      Platform.OS === 'android' &&
      prevKeyboardHeightRef.current > 0 &&
      keyboardHeight === 0
    ) {
      sendToEditor({ type: 'blurEditor' });
    }
    prevKeyboardHeightRef.current = keyboardHeight;
  }, [keyboardHeight, preview]);

  // ── Load color palette favorites ──
  useEffect(() => {
    const loadFavs = async () => {
      try {
        const val = await SecureStore.getItemAsync(FAVORITE_COLORS_KEY);
        if (val) {
          setFavoriteColors(JSON.parse(val));
        } else {
          setFavoriteColors(DEFAULT_COLORS);
        }
      } catch {
        setFavoriteColors(DEFAULT_COLORS);
      }
    };
    loadFavs();
  }, []);

  // ── Fetch and cache base64 encoded font files for offline use ──
  useEffect(() => {
    const loadFontsBase64 = async () => {
      try {
        const downloaded = await getDownloadedFonts();
        const mappings: Record<string, string> = {};
        for (const font of downloaded) {
          const fileUri = `${FileSystem.documentDirectory}fonts/${font.id}.ttf`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            const b64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            mappings[font.id] = b64;
          }
        }
        setBase64Fonts(mappings);
      } catch (e) {
        console.error('Error encoding fonts:', e);
      } finally {
        setFontsLoaded(true);
      }
    };
    loadFontsBase64();
  }, []);

  // ── Load note details if editing ──
  useEffect(() => {
    if (isNew) {
      initialContentRef.current = '';
      initialTitleRef.current = '';
      return;
    }
    const id = Number(noteId);
    if (Number.isNaN(id)) return;
    setLoading(true);
    repo
      .repoGetNotebookNote(id)
      .then(({ note }) => {
        setTitle(note.title);
        setContent(note.content);
        initialContentRef.current = note.content;
        initialTitleRef.current = note.title;
      })
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isNew, noteId]);

  // ── Font selection handler (called from FontSelectorModal) ──
  const handleSetFont = (fontName: string) => {
    setActiveFont(fontName);
    sendToEditor({ type: 'setFont', value: fontName });
  };

  // ── Verse insertion handler ──
  const handleInsertVerse = (verseMarkdown: string) => {
    const lines = verseMarkdown.split('\n');
    let htmlContent = '';
    lines.forEach((line) => {
      if (line.startsWith('> ')) {
        const clean = line.substring(2)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .trim();
        htmlContent += clean + '<br/>';
      }
    });
    sendToEditor({ type: 'insertVerse', value: htmlContent });
    setVerseModalOpen(false);
  };

  const handleInsertDictionary = (entry: StrongEntry) => {
    sendToEditor({ type: 'insertDictionary', value: formatDictionaryInsertion(entry) });
    setDictionaryModalOpen(false);
  };

  const hasUnsavedChanges = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedInitialTitle = initialTitleRef.current.trim();
    const hasContent = noteHasText(content);
    if (isNew && createdIdRef.current == null) {
      return trimmedTitle.length > 0 || hasContent;
    }
    return trimmedTitle !== trimmedInitialTitle || content !== initialContentRef.current;
  }, [content, isNew, title]);

  const persistNote = useCallback(
    async (
      htmlContent: string,
      options: { navigateBack?: boolean; silent?: boolean; showErrors?: boolean } = {},
    ): Promise<boolean> => {
      const { navigateBack = false, silent = false, showErrors = true } = options;
      if (commitSaveRef.current) return false;

      const trimmedTitle = title.trim();
      if (!silent && !trimmedTitle) {
        Alert.alert('Título requerido', 'Escribe un título para la nota.');
        return false;
      }
      if (silent && isNew && createdIdRef.current == null && !trimmedTitle && !noteHasText(htmlContent)) {
        return true;
      }

      commitSaveRef.current = true;
      setSaving(true);
      try {
        const finalTitle = trimmedTitle || 'Sin título';
        if (isNew && createdIdRef.current == null) {
          if (Number.isNaN(parsedNotebookId)) throw new Error('Cuaderno no válido');
          const created = await repo.repoCreateNotebookNote(parsedNotebookId, finalTitle, htmlContent);
          createdIdRef.current = created.id;
        } else {
          const id = isNew ? createdIdRef.current! : Number(noteId);
          await repo.repoUpdateNotebookNote(id, finalTitle, htmlContent);
        }
        initialContentRef.current = htmlContent;
        // Se guarda el título tal cual lo escribió el usuario (no 'Sin título')
        // para que la comparación de cambios pendientes sea estable.
        initialTitleRef.current = trimmedTitle;
        setSaveFlash(true);
        if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
        saveFlashTimerRef.current = setTimeout(() => setSaveFlash(false), 2000);
        if (!silent && !isOnline) {
          Alert.alert(
            'Guardado offline',
            'La nota quedó guardada en el dispositivo. Se sincronizará cuando vuelvas a tener conexión.',
          );
        }
        if (navigateBack) router.back();
        return true;
      } catch (err) {
        if (!showErrors) {
          // Autoguardado: fallar en silencio, se reintenta en el próximo ciclo.
        } else if (silent) {
          Alert.alert(
            'No se pudo guardar',
            err instanceof Error ? err.message : 'Revisa tu conexión e inténtalo de nuevo.',
          );
        } else {
          Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
        }
        return false;
      } finally {
        commitSaveRef.current = false;
        setSaving(false);
      }
    },
    [isNew, isOnline, noteId, parsedNotebookId, title],
  );

  const requestEditorHtml = useCallback(
    (onHtml: (html: string) => void) => {
      if (preview) {
        onHtml(content);
        return;
      }
      saveHtmlPendingRef.current = true;
      sendToEditor({ type: 'getHtml' });
      if (saveFallbackTimerRef.current) clearTimeout(saveFallbackTimerRef.current);
      saveFallbackTimerRef.current = setTimeout(() => {
        if (!saveHtmlPendingRef.current) return;
        saveHtmlPendingRef.current = false;
        onHtml(content);
      }, 450);
    },
    [content, preview],
  );

  const finishPendingLeave = useCallback(
    async (html: string) => {
      const leaveAction = leaveAfterSaveRef.current;
      leaveAfterSaveRef.current = null;
      autoLeavingRef.current = false;
      if (!leaveAction) return;

      const saved = await persistNote(html, { silent: true });
      if (saved) {
        navigation.dispatch(leaveAction);
      }
    },
    [navigation, persistNote],
  );

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'onChange') {
        setContent(data.html);
      } else if (data.type === 'getHtmlResponse') {
        saveHtmlPendingRef.current = false;
        if (saveFallbackTimerRef.current) {
          clearTimeout(saveFallbackTimerRef.current);
          saveFallbackTimerRef.current = null;
        }
        if (leaveAfterSaveRef.current) {
          void finishPendingLeave(data.html);
        } else {
          void persistNote(data.html, { navigateBack: true });
        }
      } else if (data.type === 'openFontModal') {
        setFontModalOpen(true);
      } else if (data.type === 'openVerseModal') {
        setVerseModalOpen(true);
      } else if (data.type === 'openDictionaryModal') {
        setDictionaryModalOpen(true);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const save = () => {
    requestEditorHtml((html) => {
      void persistNote(html, { navigateBack: true });
    });
  };

  // ponytail: auto-save on back/swipe only; no debounced save while typing
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (autoLeavingRef.current || !hasUnsavedChanges() || commitSaveRef.current) return;

      e.preventDefault();
      autoLeavingRef.current = true;
      leaveAfterSaveRef.current = e.data.action;
      requestEditorHtml((html) => {
        void finishPendingLeave(html);
      });
    });
    return unsubscribe;
  }, [finishPendingLeave, hasUnsavedChanges, navigation, requestEditorHtml]);

  // Autoguardado: tras 4s sin teclear se persiste en silencio, así la nota
  // sobrevive aunque Android mate la app o se cierre sin pasar por "atrás".
  useEffect(() => {
    if (loading || !hasUnsavedChanges()) return;
    const timer = setTimeout(() => {
      if (commitSaveRef.current || autoLeavingRef.current) return;
      void persistNote(content, { silent: true, showErrors: false });
    }, 4000);
    return () => clearTimeout(timer);
  }, [content, title, loading, hasUnsavedChanges, persistNote]);

  useEffect(() => {
    return () => {
      if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
    };
  }, []);

  const togglePreview = () => {
    if (!preview) Keyboard.dismiss();
    setPreview((p) => !p);
  };

  const remove = () => {
    if (isNew) return;
    Alert.alert('Eliminar nota', '¿Seguro que quieres eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await repo.repoDeleteNotebookNote(Number(noteId));
            router.back();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  // ── Loading guard ──
  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ── Build the initial HTML template once ──
  if (!initialHtmlRef.current) {
    initialHtmlRef.current = getEditorHtml(
      colors,
      initialContentRef.current,
      activeFont,
      base64Fonts,
      false,
      favoriteColors,
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva nota' : 'Editar nota',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 8 }}>
              {!isNew ? (
                <Pressable onPress={remove}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Borrar</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={save} disabled={saving}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {saving ? '…' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: colors.background, paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom }}>
        {/* Title Input */}
        <View style={styles.titleWrapper}>
          <TextInput
            style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Título de la nota"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => {
              webViewRef.current?.injectJavaScript(
                "(function(){var e=document.getElementById('editor');if(e)e.focus();})();true;",
              );
            }}
          />
        </View>

        {/* Preview Toggle */}
        <View style={styles.previewToggleWrapper}>
          <Pressable onPress={togglePreview} style={styles.previewToggle}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {preview ? '✏️ Modo Edición' : '👁️ Vista Previa'}
            </Text>
          </Pressable>
          {saving ? (
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Guardando…</Text>
          ) : saveFlash ? (
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>✓ Guardado</Text>
          ) : null}
        </View>

        {/* Content Area — WebView stays mounted so edits survive preview toggle */}
        <View style={styles.contentArea}>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: initialHtmlRef.current! }}
            onMessage={onWebViewMessage}
            style={StyleSheet.absoluteFill}
            pointerEvents={preview ? 'none' : 'auto'}
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView={true}
            scrollEnabled={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          />

          {preview ? (
            <ScrollView style={styles.previewContainer}>
              <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <NoteContent content={content || 'Sin contenido'} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>

      <FontSelectorModal
        visible={fontModalOpen}
        onClose={() => setFontModalOpen(false)}
        currentFont={activeFont}
        onSelect={handleSetFont}
      />

      <InsertVerseModal
        visible={verseModalOpen}
        onClose={() => setVerseModalOpen(false)}
        onInsert={handleInsertVerse}
      />

      <InsertDictionaryModal
        visible={dictionaryModalOpen}
        onClose={() => setDictionaryModalOpen(false)}
        onInsert={handleInsertDictionary}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  previewToggleWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editorContainer: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  previewContainer: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 16,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 280,
    marginBottom: 20,
  },
});
