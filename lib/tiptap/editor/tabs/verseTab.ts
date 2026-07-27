import type { RibbonTab } from '../ribbonTypes'
import { hasBlockSelection } from '../blockCommands'
import { blockActionGroups } from './blockActions'

/** Pestaña contextual de un versículo insertado. */
export const verseTab: RibbonTab = {
  id: 'formato-versiculo',
  label: 'Formato de versículo',
  contextual: true,
  matches: ({ editor }) => hasBlockSelection(editor, 'verseBlock'),
  groups: blockActionGroups,
}

/** Pestaña contextual de una entrada del diccionario Strong. */
export const dictTab: RibbonTab = {
  id: 'formato-definicion',
  label: 'Formato de definición',
  contextual: true,
  matches: ({ editor }) => hasBlockSelection(editor, 'dictBlock'),
  groups: blockActionGroups,
}
