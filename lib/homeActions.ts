import * as SecureStore from 'expo-secure-store';
import type { SymbolViewProps } from 'expo-symbols';

const HOME_ACTIONS_KEY = 'BIBLIA_HOME_ACTIONS';

export type HomeActionKey =
  | 'read'
  | 'search'
  | 'note'
  | 'downloads'
  | 'image'
  | 'stats'
  | 'activity'
  | 'dictionary'
  | 'community';

export type HomeActionMeta = {
  key: HomeActionKey;
  title: string;
  description: string;
  guestDescription?: string;
  requiresAuth?: boolean;
  icon: SymbolViewProps['name'];
};

export const HOME_ACTION_CATALOG: HomeActionMeta[] = [
  {
    key: 'read',
    title: 'Ir a lectura',
    description: 'Lee la Biblia capítulo a capítulo',
    icon: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  },
  {
    key: 'search',
    title: 'Buscador avanzado',
    description: 'Busca versículos y palabras clave',
    icon: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  },
  {
    key: 'note',
    title: 'Nota rápida',
    description: 'Captura una idea al instante',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: { ios: 'note.text', android: 'edit_note', web: 'edit_note' },
  },
  {
    key: 'downloads',
    title: 'Descargas offline',
    description: 'Guarda Biblias y datos para sin conexión',
    icon: { ios: 'arrow.down.circle.fill', android: 'download', web: 'download' },
  },
  {
    key: 'image',
    title: 'Imagen de versículo',
    description: 'Selecciona un versículo y crea una imagen para compartir',
    icon: { ios: 'photo.fill', android: 'image', web: 'image' },
  },
  {
    key: 'stats',
    title: 'Estadísticas',
    description: 'Progreso de lectura por libro',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  },
  {
    key: 'activity',
    title: 'Actividad',
    description: 'Calendario y progreso reciente',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  },
  {
    key: 'dictionary',
    title: 'Diccionario Strong',
    description: 'Códigos griegos y hebreos del texto bíblico',
    icon: { ios: 'character.book.closed.fill', android: 'menu_book', web: 'menu_book' },
  },
  {
    key: 'community',
    title: 'Comunidad',
    description: 'Publicaciones de tu iglesia',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
  },
];

export const DEFAULT_HOME_ACTIONS: HomeActionKey[] = [
  'read',
  'search',
  'note',
  'stats',
  'activity',
  'dictionary',
  'community',
];

export async function getHomeActions(): Promise<HomeActionKey[]> {
  try {
    const raw = await SecureStore.getItemAsync(HOME_ACTIONS_KEY);
    if (!raw) return DEFAULT_HOME_ACTIONS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_HOME_ACTIONS;
    const valid = parsed.filter((key): key is HomeActionKey =>
      HOME_ACTION_CATALOG.some((action) => action.key === key),
    );
    return valid.length > 0 ? valid : DEFAULT_HOME_ACTIONS;
  } catch {
    return DEFAULT_HOME_ACTIONS;
  }
}

export async function saveHomeActions(keys: HomeActionKey[]) {
  await SecureStore.setItemAsync(HOME_ACTIONS_KEY, JSON.stringify(keys));
}
