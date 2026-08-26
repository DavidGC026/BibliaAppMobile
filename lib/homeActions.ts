import * as SecureStore from 'expo-secure-store';
import type { AppIconName } from '@/components/ui/AppIcon';

const HOME_ACTIONS_KEY = 'BIBLIA_HOME_ACTIONS';

export type HomeActionKey =
  | 'read'
  | 'search'
  | 'universalSearch'
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
  icon: AppIconName;
};

export const HOME_ACTION_CATALOG: HomeActionMeta[] = [
  {
    key: 'read',
    title: 'Ir a lectura',
    description: 'Lee la Biblia capítulo a capítulo',
    icon: 'bible',
  },
  {
    key: 'search',
    title: 'Buscador avanzado',
    description: 'Busca versículos y palabras clave en la Biblia',
    icon: 'search',
  },
  {
    key: 'universalSearch',
    title: 'Búsqueda universal',
    description: 'Busca a la vez en Biblia, notas, devocionales y diccionario',
    icon: 'search',
  },
  {
    key: 'note',
    title: 'Nota rápida',
    description: 'Captura una idea al instante',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: 'notes',
  },
  {
    key: 'downloads',
    title: 'Descargas offline',
    description: 'Guarda Biblias y datos para sin conexión',
    icon: 'download',
  },
  {
    key: 'image',
    title: 'Imagen de versículo',
    description: 'Selecciona un versículo y crea una imagen para compartir',
    icon: 'image',
  },
  {
    key: 'stats',
    title: 'Estadísticas',
    description: 'Progreso de lectura por libro',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: 'chart',
  },
  {
    key: 'activity',
    title: 'Actividad',
    description: 'Calendario y progreso reciente',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: 'calendar',
  },
  {
    key: 'dictionary',
    title: 'Diccionario Strong',
    description: 'Códigos griegos y hebreos del texto bíblico',
    icon: 'dictionary',
  },
  {
    key: 'community',
    title: 'Comunidad',
    description: 'Publicaciones de tu iglesia',
    guestDescription: 'Requiere iniciar sesión',
    requiresAuth: true,
    icon: 'community',
  },
];

export const DEFAULT_HOME_ACTIONS: HomeActionKey[] = [
  'read',
  'search',
  'universalSearch',
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
