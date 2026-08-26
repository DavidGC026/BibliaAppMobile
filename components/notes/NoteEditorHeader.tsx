import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { useState } from 'react'

import { useThemeColors } from '@/hooks/useThemeColors'

/**
 * Cabecera del editor de notas: una sola fila.
 *
 * Volver, título, estado de guardado, Guardar y el menú de tres puntos. Lo que
 * antes ocupaba la cabecera nativa más una segunda fila propia cabe aquí, y el
 * cuerpo de la nota se queda con el resto de la pantalla.
 *
 * No sabe guardar ni compartir: recibe las acciones. Así la pantalla conserva
 * toda la lógica y esta cabecera se puede mirar sola.
 */

export type NoteSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export type NoteEditorMenuAction = {
  label: string
  icon: SymbolViewProps['name']
  danger?: boolean
  onPress: () => void
}

type Props = {
  title: string
  onChangeTitle: (title: string) => void
  onBack: () => void
  onSave: () => void
  saveState: NoteSaveState
  words: number
  preview: boolean
  onTogglePreview: () => void
  menu: NoteEditorMenuAction[]
  onSubmitTitle?: () => void
}

const SAVE_LABEL: Record<NoteSaveState, string> = {
  idle: 'Guardar',
  dirty: 'Guardar',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'Reintentar',
}

const STATUS_LABEL: Record<NoteSaveState, string> = {
  idle: '',
  dirty: 'Cambios pendientes',
  saving: 'Autoguardando…',
  saved: 'Guardado automáticamente',
  error: 'No se pudo guardar',
}

export function NoteEditorHeader({
  title,
  onChangeTitle,
  onBack,
  onSave,
  saveState,
  words,
  preview,
  onTogglePreview,
  menu,
  onSubmitTitle,
}: Props) {
  const colors = useThemeColors()
  const [menuOpen, setMenuOpen] = useState(false)

  const statusColor =
    saveState === 'error' ? colors.danger : saveState === 'saved' ? colors.primary : colors.textMuted
  const status = STATUS_LABEL[saveState]
  const saveIsPrimary = saveState === 'dirty' || saveState === 'error'

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Volver" style={styles.iconBtn}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          tintColor={colors.text}
          size={18}
        />
      </Pressable>

      <View style={styles.titleBlock}>
        <TextInput
          style={[styles.titleInput, { color: colors.text }]}
          placeholder="Título de la nota"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={onChangeTitle}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={onSubmitTitle}
        />
        <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
          {status ? `${status} · ` : ''}
          {words} {words === 1 ? 'palabra' : 'palabras'}
        </Text>
      </View>

      <Pressable
        onPress={onTogglePreview}
        hitSlop={6}
        accessibilityLabel={preview ? 'Editar' : 'Vista previa'}
        style={[
          styles.iconBtn,
          preview ? { backgroundColor: colors.primarySoft, borderRadius: 999 } : null,
        ]}
      >
        <SymbolView
          name={preview ? { ios: 'pencil', android: 'edit', web: 'edit' } : { ios: 'eye', android: 'visibility', web: 'visibility' }}
          tintColor={colors.primary}
          size={16}
        />
      </Pressable>

      <Pressable
        onPress={onSave}
        disabled={saveState === 'saving'}
        accessibilityLabel="Guardar la nota"
        style={[
          styles.saveBtn,
          saveIsPrimary
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { backgroundColor: 'transparent', borderColor: colors.border },
        ]}
      >
        <Text
          style={{
            color: saveIsPrimary ? colors.primaryForeground : colors.textMuted,
            fontWeight: '800',
            fontSize: 12,
          }}
        >
          {SAVE_LABEL[saveState]}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        accessibilityLabel="Más acciones"
        style={styles.iconBtn}
      >
        <SymbolView
          name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
          tintColor={colors.text}
          size={18}
        />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {menu.map((action) => (
              <Pressable
                key={action.label}
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false)
                  action.onPress()
                }}
              >
                <SymbolView
                  name={action.icon}
                  tintColor={action.danger ? colors.danger : colors.text}
                  size={16}
                />
                <Text
                  style={{
                    color: action.danger ? colors.danger : colors.text,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, gap: 1 },
  titleInput: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  status: { fontSize: 10, fontWeight: '500' },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'flex-end',
    paddingTop: 52,
    paddingRight: 10,
  },
  menu: {
    minWidth: 210,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
})
