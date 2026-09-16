/**
 * Iconos vectoriales de la cinta.
 *
 * La cinta vive dentro del HTML del WebView, por lo que no puede renderizar
 * componentes de React Native como `@expo/vector-icons` o `AppIcon`. Mantener
 * las siluetas en este registro deja un único lenguaje visual dentro del
 * bundle y evita volver a glifos Unicode dependientes de la fuente del móvil.
 */
const ICON_PATHS = {
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h9a6 6 0 0 1 6 6"/>',
  redo: '<path d="m15 7 5 5-5 5"/><path d="M20 12h-9a6 6 0 0 0-6 6"/>',
  type: '<path d="M4 6V4h16v2"/><path d="M12 4v16"/><path d="M8 20h8"/>',
  paragraph: '<path d="M13 4v16"/><path d="M17 4v16"/><path d="M13 4H9a4 4 0 0 0 0 8h4"/>',
  bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7Z"/><path d="M7 12h7a4 4 0 0 1 0 8H7Z"/>',
  italic: '<path d="M15 4h4"/><path d="M5 20h4"/><path d="m14 4-4 16"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 21h16"/>',
  strike: '<path d="M16 6.5A5 5 0 0 0 12 5c-2.5 0-4 1.2-4 3 0 1.1.6 1.8 1.7 2.3"/><path d="M8 17.5A5 5 0 0 0 12 19c2.5 0 4-1.2 4-3 0-1.1-.6-1.8-1.7-2.3"/><path d="M4 12h16"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>',
  listOrdered: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5h1v3M4 11h2l-2 3h2M4 17h2v3H4"/>',
  quote: '<path d="M9 11H5a4 4 0 0 1 4-4v8a3 3 0 0 1-3 3"/><path d="M19 11h-4a4 4 0 0 1 4-4v8a3 3 0 0 1-3 3"/>',
  alignLeft: '<path d="M4 6h16M4 10h11M4 14h16M4 18h9"/>',
  alignCenter: '<path d="M4 6h16M7 10h10M4 14h16M6 18h12"/>',
  alignRight: '<path d="M4 6h16M9 10h11M4 14h16M11 18h9"/>',
  alignFull: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  bookOpen: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v16H5.5A2.5 2.5 0 0 0 3 21.5Z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v16h5.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
  bookSearch: '<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v16H5.5A2.5 2.5 0 0 0 3 21.5Z"/><path d="M13 3h5.5A2.5 2.5 0 0 1 21 5.5V11"/><circle cx="16.5" cy="15.5" r="3.5"/><path d="m19 18 2 2"/>',
  layers: '<path d="m12 3-9 5 9 5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
  arrowUp: '<path d="m12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M18 13l-6 6-6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.7 8.4 11.3 6.1M8.7 15.6 20 9.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  rowAdd: '<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M3 10h14M3 15h14M21 12v6M18 15h6"/>',
  rowRemove: '<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M3 10h14M3 15h14M18 15h6"/>',
  columnAdd: '<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M8 4v16M13 4v16M21 12v6M18 15h6"/>',
  columnRemove: '<rect x="3" y="4" width="14" height="16" rx="2"/><path d="M8 4v16M13 4v16M18 15h6"/>',
  merge: '<path d="M4 5h6v5H4zM14 5h6v5h-6zM4 14h6v5H4zM14 14h6v5h-6z"/><path d="M8 12h8M12 8v8"/>',
  split: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M12 5v14M8 12h8"/>',
  header: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16"/><path d="M4 5h4v3H4zM10 5h4v3h-4zM16 5h4v3h-4z" fill="currentColor" stroke="none"/>',
  behindText: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="m4 13 4-4 3 3 2-2 3 3M9 20h11M17 16v8"/>',
  horizontal: '<path d="M5 12h14M9 8l-4 4 4 4M15 8l4 4-4 4"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
} as const

export type RibbonIconName = keyof typeof ICON_PATHS

/** SVG seguro: el contenido procede únicamente del registro estático anterior. */
export function ribbonIconSvg(name: RibbonIconName): string {
  return `<svg class="ribbon-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`
}
