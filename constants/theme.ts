/** Tokens de diseño alineados con app/globals.css (shadcn + BibliaAPP web). */
export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  '2xl': 16,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700' as const },
  h3: { fontSize: 15, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22 },
  bodyLg: { fontSize: 17, lineHeight: 26 },
  caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
  label: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
};

export const shadow = {
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

/** Badge de tema del versículo del día (web: THEME_COLORS). */
export const THEME_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  Amor: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  Fe: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  Fortaleza: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  Ansiedad: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  Esperanza: { bg: '#F0F9FF', text: '#0369A1', border: '#BAE6FD' },
  Paz: { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4' },
  Consuelo: { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
  Promesa: { bg: '#FDF4FF', text: '#A21CAF', border: '#F5D0FE' },
};

export const THEME_BADGE_DARK: Record<string, { bg: string; text: string; border: string }> = {
  Amor: { bg: '#4C0519', text: '#FDA4AF', border: '#881337' },
  Fe: { bg: '#451A03', text: '#FCD34D', border: '#78350F' },
  Fortaleza: { bg: '#052E16', text: '#6EE7B7', border: '#065F46' },
  Ansiedad: { bg: '#1E1B4B', text: '#A5B4FC', border: '#3730A3' },
  Esperanza: { bg: '#0C4A6E', text: '#7DD3FC', border: '#0369A1' },
  Paz: { bg: '#134E4A', text: '#5EEAD4', border: '#0F766E' },
  Consuelo: { bg: '#3B0764', text: '#D8B4FE', border: '#6B21A8' },
  Promesa: { bg: '#4A044E', text: '#F0ABFC', border: '#86198F' },
};
