import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as api from '@/lib/api';

import { FontSelectorModal } from '@/components/FontSelectorModal';
import { InsertDictionaryModal } from '@/components/InsertDictionaryModal';
import { InsertVerseModal } from '@/components/InsertVerseModal';
import { NoteContent } from '@/components/NoteContent';
import {
  NoteEditorHeader,
  type NoteEditorMenuAction,
  type NoteSaveState,
} from '@/components/notes/NoteEditorHeader';
import { useNetwork } from '@/context/NetworkContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useKeyboardMetrics } from '@/hooks/useKeyboardHeight';
import * as repo from '@/lib/repo';
import { formatDictionaryInsertion } from '@/lib/dictionaryInsert';
import { getEditorHtml } from '@/lib/editorHtml';
import { deleteNoteFont, getDownloadedFonts, getNoteFont, saveNoteFont } from '@/lib/fontManager';
import { countNoteWords, noteHtmlToPlainText } from '@/lib/notebookCovers';
import { exportNoteAsPdf } from '@/lib/noteExport';
import { shareNote } from '@/lib/share';
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
  const [saveFailed, setSaveFailed] = useState(false);
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
  const keyboard = useKeyboardMetrics();
  const keyboardHeight = keyboard.height;

  const insets = useSafeAreaInsets();

  const webViewRef = useRef<WebView>(null);
  const contentAreaRef = useRef<View>(null);
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

  /**
   * Mide cuánto del WebView tapa de verdad el teclado y se lo dice a la página.
   *
   * El relleno de abajo de esta pantalla ya aparta el WebView, pero esa cuenta
   * se queda corta de vez en cuando: con edge-to-edge el alto que anuncia el
   * teclado no siempre incluye la barra de navegación, y entre que llega el
   * aviso y se maqueta puede haber unos puntos de diferencia. El resultado era
   * la cinta a medio tapar. En vez de afinar la cuenta se mide el resultado:
   * dónde acaba el WebView frente al borde superior del teclado. Lo que sobre
   * lo descuenta la propia página, así que el error se corrige solo.
   */
  const reportKeyboardOverlap = useCallback(() => {
    const area = contentAreaRef.current;
    if (!area) return;
    area.measureInWindow((_x, y, _width, height) => {
      const covered =
        keyboard.topY === null ? 0 : Math.max(0, Math.round(y + height - keyboard.topY));
      sendToEditor({ type: 'setKeyboardInset', value: keyboard.height, covered });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboard.height, keyboard.topY]);

  // Scroll caret when keyboard opens; blur editor on Android when it closes (back button).
  useEffect(() => {
    if (preview) return;
    reportKeyboardOverlap();
    // La medida solo vale una vez maquetado con el relleno nuevo.
    const again = requestAnimationFrame(reportKeyboardOverlap);
    if (
      Platform.OS === 'android' &&
      prevKeyboardHeightRef.current > 0 &&
      keyboardHeight === 0
    ) {
      sendToEditor({ type: 'blurEditor' });
    }
    prevKeyboardHeightRef.current = keyboardHeight;
    return () => cancelAnimationFrame(again);
  }, [keyboardHeight, preview, reportKeyboardOverlap]);

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

  const loadFontsBase64 = useCallback(async () => {
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
    return mappings;
  }, []);

  // ── Fetch and cache base64 encoded font files for offline use ──
  useEffect(() => {
    loadFontsBase64()
      .catch((e) => console.error('Error encoding fonts:', e))
      .finally(() => setFontsLoaded(true));
  }, [loadFontsBase64]);

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
      .then(async ({ note }) => {
        setTitle(note.title);
        setContent(note.content);
        initialContentRef.current = note.content;
        initialTitleRef.current = note.title;
        // Restaurar la fuente elegida para esta nota antes de montar el editor
        setActiveFont(await getNoteFont(id));
      })
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isNew, noteId]);

  // ── Font selection handler (called from FontSelectorModal) ──
  const handleSetFont = async (fontName: string) => {
    setActiveFont(fontName);
    // Persistir de inmediato: cambiar solo la fuente no altera el HTML
    // guardado, así que no pasa por el flujo de guardado de contenido.
    const realId = isNew ? createdIdRef.current : Number(noteId);
    if (realId != null && !Number.isNaN(realId)) {
      void saveNoteFont(realId, fontName);
    }
    try {
      const fonts = await loadFontsBase64();
      sendToEditor({ type: 'loadFonts', value: fonts });
    } catch (e) {
      console.error('Error refreshing fonts:', e);
    }
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
          // La fuente elegida antes del primer guardado aún no tenía id de nota
          if (activeFont !== 'Default') void saveNoteFont(created.id, activeFont);
        } else {
          const id = isNew ? createdIdRef.current! : Number(noteId);
          await repo.repoUpdateNotebookNote(id, finalTitle, htmlContent);
        }
        initialContentRef.current = htmlContent;
        // Se guarda el título tal cual lo escribió el usuario (no 'Sin título')
        // para que la comparación de cambios pendientes sea estable.
        initialTitleRef.current = trimmedTitle;
        setSaveFailed(false);
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
        setSaveFailed(true);
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
    [activeFont, isNew, isOnline, noteId, parsedNotebookId, title],
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
      }, 5000);
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

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para insertar imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.80,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      let imageUrl = '';

      if (isOnline) {
        try {
          const fileName = asset.fileName ?? `note-img-${Date.now()}.jpg`;
          const mimeType = asset.mimeType ?? 'image/jpeg';
          const uploadRes = await api.uploadImage(asset.uri, fileName, mimeType);
          // URL pública absoluta: la relativa (/api/media/:id) no resuelve en el
          // WebView y además exige sesión, así que el <img> daría 403.
          if (uploadRes.filename) {
            imageUrl = api.getPublicUploadUrl(uploadRes.filename);
          }
        } catch (uploadErr) {
          console.warn('Upload failed, falling back to base64:', uploadErr);
        }
      }

      if (!imageUrl) {
        // Fallback to base64
        try {
          const b64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mime = asset.mimeType ?? 'image/jpeg';
          imageUrl = `data:${mime};base64,${b64}`;
        } catch (readErr) {
          Alert.alert('Error', 'No se pudo leer la imagen local.');
          return;
        }
      }

      sendToEditor({ type: 'insertImage', value: imageUrl });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo seleccionar la imagen');
    }
  };

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
      } else if (data.type === 'openImagePicker') {
        void handleImagePick();
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

  const words = countNoteWords(content);
  const saveState: NoteSaveState = saving
    ? 'saving'
    : saveFailed
      ? 'error'
      : saveFlash
        ? 'saved'
        : hasUnsavedChanges()
          ? 'dirty'
          : 'idle';

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
            void deleteNoteFont(Number(noteId));
            router.back();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const menuActions: NoteEditorMenuAction[] = [
    {
      label: 'Compartir como texto',
      icon: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
      onPress: () => void shareNote({ title, body: noteHtmlToPlainText(content) }),
    },
    {
      label: 'Exportar como PDF',
      icon: { ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' },
      onPress: async () => {
        try {
          await exportNoteAsPdf({ title, contentHtml: content });
        } catch {
          Alert.alert('Error', 'No se pudo generar el PDF.');
        }
      },
    },
    ...(isNew
      ? []
      : ([
          {
            label: 'Eliminar nota',
            icon: { ios: 'trash', android: 'delete', web: 'delete' },
            danger: true,
            onPress: remove,
          },
        ] as NoteEditorMenuAction[])),
  ];

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
      {/* La cabecera nativa se sustituye por la propia: una sola fila, y el
          cuerpo de la nota se queda con toda la pantalla. */}
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom,
        }}
      >
        <NoteEditorHeader
          title={title}
          onChangeTitle={setTitle}
          onBack={() => router.back()}
          onSave={save}
          saveState={saveState}
          words={words}
          preview={preview}
          onTogglePreview={togglePreview}
          menu={menuActions}
          onSubmitTitle={() =>
            webViewRef.current?.injectJavaScript(
              "(function(){var e=document.querySelector('#editor .ProseMirror');if(e)e.focus();})();true;",
            )
          }
        />

        {/* Content Area — WebView stays mounted so edits survive preview toggle */}
        <View ref={contentAreaRef} style={styles.contentArea} onLayout={reportKeyboardOverlap}>
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
            <ScrollView style={[styles.previewContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <NoteContent content={content || 'Sin contenido'} font={activeFont} />
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
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  previewContainer: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 280,
    marginBottom: 20,
  },
});
