import type { Editor } from '@tiptap/core'
import type { RibbonIconName } from './ribbonIcons'

/**
 * Contrato de la cinta de opciones.
 *
 * Una pestaña solo sabe dibujar sus grupos y pedirle cosas al editor. No conoce
 * a las demás, ni al puente con React Native, ni cómo se guarda la nota: recibe
 * lo justo por `RibbonContext` (segregación de interfaces).
 *
 * ponytail: equivalente de desktop/src/components/notes/tiptap/ribbonTypes.ts
 */

export type RibbonContext = {
  editor: Editor
  /** Envía un mensaje al anfitrión React Native (abrir un modal, por ejemplo). */
  post: (message: Record<string, unknown>) => void
  /** Colores favoritos del usuario, para el grupo de color. */
  colors: string[]
  /** Abre la rueda cromática. */
  openColorWheel: () => void
  /** Cierra la selección de bloque o imagen y con ella la pestaña contextual. */
  clearSelection: () => void
}

export type RibbonButtonSpec = {
  kind?: 'button'
  /** Texto visible en botones anchos y alternativa cuando no hay icono. */
  label: string
  /** Icono SVG del registro propio del WebView. */
  icon?: RibbonIconName
  /** Descripción para accesibilidad; si falta se usa `label`. */
  hint?: string
  /** Ocupa más ancho: para etiquetas de palabra completa. */
  wide?: boolean
  /** Rojo: acciones destructivas. */
  danger?: boolean
  /** Jerarquía tipográfica para los estilos H1/H2. */
  emphasis?: 'heading-1' | 'heading-2'
  /** Estilo del botón según el formato aplicado en el cursor. */
  active?: (ctx: RibbonContext) => boolean
  /** Deshabilitado cuando la acción no aplica. */
  disabled?: (ctx: RibbonContext) => boolean
  run: (ctx: RibbonContext) => void
}

/** Paleta de colores favoritos, «Auto» y rueda cromática. */
export type RibbonColorsSpec = { kind: 'colors' }

/** Selector desplegable (tamaño de letra, tipografía). */
export type RibbonSelectSpec = {
  kind: 'select'
  hint: string
  options: { value: string; label: string }[]
  value: (ctx: RibbonContext) => string
  run: (ctx: RibbonContext, value: string) => void
}

export type RibbonItem = RibbonButtonSpec | RibbonColorsSpec | RibbonSelectSpec

export type RibbonGroup = {
  /** Etiqueta bajo el grupo, como en Word. */
  label: string
  items: RibbonItem[]
}

export type RibbonTab = {
  id: string
  label: string
  /** Identidad visual de la pestaña, especialmente útil en las contextuales. */
  icon?: RibbonIconName
  /** Solo aparece cuando `matches` es cierto, y entonces se activa sola. */
  contextual?: boolean
  matches?: (ctx: RibbonContext) => boolean
  groups: (ctx: RibbonContext) => RibbonGroup[]
}
