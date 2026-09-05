import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppTheme } from '@/hooks/useAppTheme';
import { loadEditorCatalog, saveEditorCatalog } from '@/lib/api';
import { WORD_CATEGORIES } from '@/lib/games/catalog';
import { CONTENT_LABELS, useContentEditor, type ContentDraft, type ContentKind } from '@/lib/games/editor';
import { GameButton, GameCard, GameText, LiveMessage, styles } from './ui';

export function ContentEditor({ onEdit }: { onEdit: () => void }) {
  const { colors } = useAppTheme();
  const editor = useContentEditor(loadEditorCatalog, saveEditorCatalog);
  const [limit, setLimit] = useState(20);
  const fields: { key: keyof ContentDraft; label: string; max: number; multiline?: boolean }[] = editor.kind === 'words'
    ? [{ key: 'word', label: 'Palabra (4 a 7 letras)', max: 20 }, { key: 'clue', label: 'Pista', max: 300, multiline: true }]
    : editor.kind === 'pairs' ? [{ key: 'left', label: 'Personaje', max: 80 }, { key: 'right', label: 'Historia de su pareja', max: 180, multiline: true }] : [];
  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }];
  return <View style={styles.column}>
    <GameText heading>Contenido de los juegos</GameText><GameText muted>Agrega o corrige palabras, pistas, parejas y pasajes. Revisa la vista previa antes de publicar.</GameText>
    {Object.entries(CONTENT_LABELS).map(([kind, label]) => <GameButton key={kind} label={label} secondary={editor.kind !== kind} selected={editor.kind === kind} disabled={editor.busy} onPress={() => { editor.chooseKind(kind as ContentKind); setLimit(20); }} />)}
    {!!editor.error && <LiveMessage text={editor.error} />}{!!editor.notice && <LiveMessage text={editor.notice} />}
    <GameButton secondary label={editor.busy ? 'Procesando…' : 'Recargar catálogo'} disabled={editor.busy} onPress={() => void editor.reload()} />
    {editor.content && <>
      <GameCard><GameText heading>{editor.editing === null ? 'Agregar contenido' : 'Editar contenido'}</GameText>
        {fields.map(field => <View key={field.key} style={{ gap: 8 }}><GameText>{field.label}</GameText><TextInput accessibilityLabel={field.label} value={editor.draft[field.key]} onChangeText={value => editor.change(field.key, value)} editable={!editor.busy} maxLength={field.max} multiline={field.multiline} numberOfLines={field.multiline ? 3 : 1} textAlignVertical={field.multiline ? 'top' : 'center'} style={[inputStyle, field.multiline ? { minHeight: 110 } : {}]} /></View>)}
        {editor.kind === 'words' && <><GameText>Categoría</GameText><Picker accessibilityLabel="Categoría" enabled={!editor.busy} selectedValue={editor.draft.category} onValueChange={value => editor.change('category', String(value))} style={{ color: colors.text }} itemStyle={{ color: colors.text }} dropdownIconColor={colors.text}>{WORD_CATEGORIES.map(category => <Picker.Item key={category} label={category} value={category} />)}</Picker></>}
        <GameText>Libro bíblico</GameText><Picker accessibilityLabel="Libro bíblico" enabled={!editor.busy} selectedValue={editor.draft.bookId} onValueChange={value => editor.change('bookId', String(value))} style={{ color: colors.text }} itemStyle={{ color: colors.text }} dropdownIconColor={colors.text}>{editor.content.books.map(book => <Picker.Item key={book.bookId} label={book.name} value={String(book.bookId)} />)}</Picker>
        <View style={styles.row}>{([['chapter', 'Capítulo'], ['verse', 'Versículo']] as const).map(([key, label]) => <View key={key} style={{ flex: 1, gap: 8 }}><GameText>{label}</GameText><TextInput accessibilityLabel={label} value={editor.draft[key]} onChangeText={value => editor.change(key, value)} keyboardType="number-pad" editable={!editor.busy} maxLength={3} style={inputStyle} /></View>)}</View>
        {editor.kind !== 'passages' && <><GameText>Referencia visible (opcional)</GameText><TextInput accessibilityLabel="Referencia visible (opcional)" value={editor.draft.reference} onChangeText={value => editor.change('reference', value)} editable={!editor.busy} maxLength={120} placeholder="Por ejemplo: Génesis 17:5-8" placeholderTextColor={colors.textMuted} style={inputStyle} /><GameText muted>Si la dejas vacía, se usará el libro, capítulo y versículo elegidos.</GameText></>}
        <GameButton label="Vista previa" disabled={editor.busy} onPress={editor.prepare} />{editor.editing !== null && <GameButton secondary label="Cancelar edición" disabled={editor.busy} onPress={() => editor.chooseKind(editor.kind)} />}
      </GameCard>
      {editor.preview && <GameCard><GameText heading>Vista previa</GameText><GameText>{editor.kind === 'words' ? editor.draft.word.toUpperCase() : editor.kind === 'pairs' ? editor.draft.left : 'Nuevo pasaje para completar y ordenar'}</GameText><GameText>{editor.kind === 'words' ? editor.draft.clue : editor.kind === 'pairs' ? editor.draft.right : 'El texto se obtendrá de la versión bíblica elegida al jugar.'}</GameText><GameText muted>{editor.draft.reference || `${editor.content.books.find(book => book.bookId === Number(editor.draft.bookId))?.name} ${editor.draft.chapter}:${editor.draft.verse}`}</GameText><GameButton label="Publicar contenido" disabled={editor.busy} onPress={() => void editor.publish()} /></GameCard>}
      <GameText heading>Catálogo · {editor.content.catalog[editor.kind].length} entradas</GameText><GameText>Buscar contenido</GameText><TextInput accessibilityLabel="Buscar contenido" value={editor.search} onChangeText={value => { editor.setSearch(value); setLimit(20); }} style={inputStyle} />
      {editor.entries.slice(0, limit).map(entry => <GameCard key={entry.index}><GameText heading>{entry.title}</GameText><GameText muted>{entry.detail}</GameText><GameButton secondary label={`Editar ${entry.title}`} disabled={editor.busy} onPress={() => { editor.edit(entry.index); onEdit(); }} /></GameCard>)}
      {editor.entries.length > limit && <GameButton secondary label="Mostrar más" onPress={() => setLimit(value => value + 20)} />}{!editor.entries.length && <GameText>No hay resultados para esa búsqueda.</GameText>}
    </>}
  </View>;
}
