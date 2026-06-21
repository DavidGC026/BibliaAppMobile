import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

import { FontSelectorModal } from '@/components/FontSelectorModal';
import { InsertVerseModal } from '@/components/InsertVerseModal';
import { NoteContent } from '@/components/NoteContent';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as repo from '@/lib/repo';
import { getEditorHtml } from '@/lib/editorHtml';
import { getDownloadedFonts } from '@/lib/fontManager';

const FAVORITE_COLORS_KEY = 'NOTE_FAVORITE_COLORS';
const DEFAULT_COLORS = [
  '#3D3835', // Marrón oscuro / Text claro
  '#E7E5E4', // Text oscuro
  '#92700C', // Bronce claro / Primary claro
  '#E8B84A', // Dorado oscuro / Primary oscuro
  '#EF4444', // Rojo
  '#F97316', // Naranja
  '#F59E0B', // Amarillo
  '#10B981', // Verde
  '#0EA5E9', // Azul
  '#8B5CF6', // Púrpura
  '#EC4899', // Rosa
];

export default function NoteEditorScreen() {
  const colors = useThemeColors();
  const { noteId, notebookId } = useLocalSearchParams<{ noteId: string; notebookId?: string }>();
  const isNew = noteId === 'new';
  const parsedNotebookId = notebookId ? Number(notebookId) : NaN;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [verseModalOpen, setVerseModalOpen] = useState(false);
  const [fontModalOpen, setFontModalOpen] = useState(false);

  // Formatting state
  const [activeFont, setActiveFont] = useState('Default');
  const [activeSize, setActiveSize] = useState('16px');
  const [activeColor, setActiveColor] = useState(colors.text);
  const [favoriteColors, setFavoriteColors] = useState<string[]>(DEFAULT_COLORS);
  
  // Custom font base64 mappings for offline support
  const [base64Fonts, setBase64Fonts] = useState<Record<string, string>>({});
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const initialContentRef = useRef<string>('');
  const initialHtmlRef = useRef<string | null>(null);

  // Load color palette favorites from SecureStore
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

  // Fetch and cache base64 encoded font files for offline use inside WebView
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

  // Load note details if editing
  useEffect(() => {
    if (isNew) {
      initialContentRef.current = '';
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
      })
      .catch((err) => Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [isNew, noteId]);

  // Command handlers to communicate with WebView
  const runCommand = (command: string, value?: string) => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'exec', command, value })
    );
  };

  const handleSetFont = (fontName: string) => {
    setActiveFont(fontName);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'setFont', value: fontName })
    );
  };

  const handleSetSize = (size: string) => {
    setActiveSize(size);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'setSize', value: size })
    );
  };

  const handleSetColor = (color: string) => {
    setActiveColor(color);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'setColor', value: color })
    );
  };

  const handleInsertTable = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'insertTable' }));
  };

  const handleIndent = (dir: 'indent' | 'outdent') => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'setIndent', value: dir })
    );
  };

  const handleInsertVerse = (verseMarkdown: string) => {
    // Convert markdown quote formatting into HTML quote format for WYSIWYG
    // e.g. format is > **Ref**\n> Text
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

    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'insertVerse', value: htmlContent })
    );
    setVerseModalOpen(false);
  };

  const addColorToFavorites = async (color: string) => {
    if (favoriteColors.includes(color)) return;
    const newFavs = [color, ...favoriteColors].slice(0, 16); // cap at 16 colors
    setFavoriteColors(newFavs);
    try {
      await SecureStore.setItemAsync(FAVORITE_COLORS_KEY, JSON.stringify(newFavs));
      Alert.alert('Color guardado', 'Color añadido a tu paleta de favoritos.');
    } catch {
      console.error('Failed to save color favorites');
    }
  };

  const removeColorFromFavorites = async (color: string) => {
    const newFavs = favoriteColors.filter((c) => c !== color);
    setFavoriteColors(newFavs);
    try {
      await SecureStore.setItemAsync(FAVORITE_COLORS_KEY, JSON.stringify(newFavs));
    } catch {
      console.error('Failed to update colors');
    }
  };

  // Safe HTML content retrieval
  const requestHtmlSave = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'getHtml' }));
  };

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'onChange') {
        setContent(data.html);
      } else if (data.type === 'getHtmlResponse') {
        saveNoteWithContent(data.html);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const saveNoteWithContent = async (htmlContent: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Título requerido', 'Escribe un título para la nota.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        if (Number.isNaN(parsedNotebookId)) throw new Error('Cuaderno no válido');
        const created = await repo.repoCreateNotebookNote(parsedNotebookId, trimmedTitle, htmlContent);
        router.replace(`/note/${created.id}`);
      } else {
        await repo.repoUpdateNotebookNote(Number(noteId), trimmedTitle, htmlContent);
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (preview) {
      saveNoteWithContent(content);
    } else {
      // Query WebView to get current editor HTML and proceed to save
      requestHtmlSave();
    }
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

  if (loading || !fontsLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Set the initial HTML template string once
  if (!initialHtmlRef.current) {
    initialHtmlRef.current = getEditorHtml(
      colors,
      initialContentRef.current,
      activeFont,
      base64Fonts,
      false
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

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.container}>
          {/* Title Input */}
          <View style={styles.titleWrapper}>
            <TextInput
              style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Título"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Preview Toggle */}
          <View style={styles.previewToggleWrapper}>
            <Pressable onPress={() => setPreview((p) => !p)} style={styles.previewToggle}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {preview ? '✏️ Modo Edición' : '👁️ Vista Previa'}
              </Text>
            </Pressable>
          </View>

          {/* Content Pane */}
          {preview ? (
            <ScrollView style={styles.previewContainer}>
              <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <NoteContent content={content || 'Sin contenido'} />
              </View>
            </ScrollView>
          ) : (
            <View style={[styles.editorContainer, { borderColor: colors.border }]}>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: initialHtmlRef.current }}
                onMessage={onWebViewMessage}
                style={{ backgroundColor: colors.background }}
                keyboardDisplayRequiresUserAction={false}
                hideKeyboardAccessoryView={true}
              />
            </View>
          )}
        </View>

        {/* Toolbar formatting options (Only in editing mode) */}
        {!preview && (
          <View style={[styles.toolbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            {/* Horizontal Formatting Commands */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
              <Pressable style={styles.toolItem} onPress={() => setFontModalOpen(true)}>
                <Text style={[styles.toolIconText, { color: colors.primary, fontWeight: '800' }]}>Tt</Text>
                <Text style={[styles.toolLabel, { color: colors.textMuted }]}>{activeFont}</Text>
              </Pressable>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Font Size Selector */}
              {['14px', '16px', '20px', '26px'].map((size) => (
                <Pressable
                  key={size}
                  style={[
                    styles.toolItem,
                    activeSize === size && { backgroundColor: colors.primarySoft, borderRadius: 6 },
                  ]}
                  onPress={() => handleSetSize(size)}
                >
                  <Text style={[styles.toolIconText, { color: colors.primary, fontSize: Number(size.replace('px','')) - 2 }]}>A</Text>
                  <Text style={[styles.toolLabel, { color: colors.textMuted }]}>{size.replace('px','')}</Text>
                </Pressable>
              ))}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Action commands */}
              <Pressable style={styles.toolIconItem} onPress={() => runCommand('bold')}>
                <Text style={[styles.toolSymbol, { color: colors.text, fontWeight: '900' }]}>B</Text>
              </Pressable>
              
              <Pressable style={styles.toolIconItem} onPress={() => runCommand('italic')}>
                <Text style={[styles.toolSymbol, { color: colors.text, fontStyle: 'italic' }]}>I</Text>
              </Pressable>

              <Pressable style={styles.toolIconItem} onPress={() => runCommand('underline')}>
                <Text style={[styles.toolSymbol, { color: colors.text, textDecorationLine: 'underline' }]}>U</Text>
              </Pressable>

              <Pressable style={styles.toolIconItem} onPress={() => runCommand('insertUnorderedList')}>
                <Text style={[styles.toolSymbol, { color: colors.text }]}>•-</Text>
              </Pressable>

              <Pressable style={styles.toolIconItem} onPress={() => runCommand('insertOrderedList')}>
                <Text style={[styles.toolSymbol, { color: colors.text }]}>1.</Text>
              </Pressable>

              <Pressable style={styles.toolIconItem} onPress={() => handleIndent('indent')}>
                <Text style={[styles.toolSymbol, { color: colors.text }]}>→</Text>
              </Pressable>

              <Pressable style={styles.toolIconItem} onPress={() => handleIndent('outdent')}>
                <Text style={[styles.toolSymbol, { color: colors.text }]}>←</Text>
              </Pressable>

              <Pressable style={styles.toolIconItem} onPress={handleInsertTable}>
                <Text style={[styles.toolSymbol, { color: colors.text }]}>田</Text>
              </Pressable>
            </ScrollView>

            {/* Colors Palette & Favorites */}
            <View style={[styles.colorSection, { borderTopColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorsScroll}>
                <Pressable
                  style={[styles.addFavBtn, { borderColor: colors.primary }]}
                  onPress={() => addColorToFavorites(activeColor)}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>+</Text>
                </Pressable>

                {favoriteColors.map((color) => {
                  const isActive = activeColor.toLowerCase() === color.toLowerCase();
                  return (
                    <Pressable
                      key={color}
                      onPress={() => handleSetColor(color)}
                      onLongPress={() => {
                        Alert.alert('Quitar favorito', '¿Quieres quitar este color de tus favoritos?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Quitar', style: 'destructive', onPress: () => removeColorFromFavorites(color) }
                        ]);
                      }}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isActive && { borderWidth: 2, borderColor: colors.primary, transform: [{ scale: 1.1 }] },
                      ]}
                    />
                  );
                })}
              </ScrollView>
            </View>

            {/* Bottom auxiliary bar for verse insertion */}
            <View style={styles.fixedBar}>
              <Pressable
                style={[styles.verseBtn, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
                onPress={() => setVerseModalOpen(true)}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>📖 Insertar versículo</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

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
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, padding: 16, paddingBottom: 0 },
  titleWrapper: { marginBottom: 8 },
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  previewToggleWrapper: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  previewToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editorContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  previewContainer: {
    flex: 1,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 280,
    marginBottom: 20,
  },
  toolbar: {
    borderTopWidth: 1,
    paddingVertical: 8,
    gap: 8,
  },
  toolbarScroll: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
    height: 48,
  },
  toolItem: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolIconItem: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolIconText: {
    fontWeight: '600',
  },
  toolLabel: {
    fontSize: 10,
  },
  toolSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  colorSection: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  colorsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  addFavBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  fixedBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  verseBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
