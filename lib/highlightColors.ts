// Alineado con web: reader-toolbar (400 sólido) + verse-text (500 tint + borde).
export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'orange', 'pink'] as const;
export type HighlightColorId = (typeof HIGHLIGHT_COLORS)[number];

type HighlightTheme = {
  id: HighlightColorId;
  name: string;
  swatch: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeTextDark: string;
};

export const HIGHLIGHT_PALETTE: HighlightTheme[] = [
  {
    id: 'yellow',
    name: 'Amarillo',
    swatch: '#FACC15',
    accent: '#EAB308',
    bgLight: 'rgba(234, 179, 8, 0.22)',
    bgDark: 'rgba(234, 179, 8, 0.35)',
    badgeBgLight: 'rgba(234, 179, 8, 0.12)',
    badgeTextLight: '#A16207',
    badgeTextDark: '#FACC15',
  },
  {
    id: 'green',
    name: 'Verde',
    swatch: '#34D399',
    accent: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.22)',
    bgDark: 'rgba(16, 185, 129, 0.35)',
    badgeBgLight: 'rgba(16, 185, 129, 0.12)',
    badgeTextLight: '#047857',
    badgeTextDark: '#34D399',
  },
  {
    id: 'blue',
    name: 'Azul',
    swatch: '#38BDF8',
    accent: '#0EA5E9',
    bgLight: 'rgba(14, 165, 233, 0.22)',
    bgDark: 'rgba(14, 165, 233, 0.35)',
    badgeBgLight: 'rgba(14, 165, 233, 0.12)',
    badgeTextLight: '#0369A1',
    badgeTextDark: '#38BDF8',
  },
  {
    id: 'orange',
    name: 'Naranja',
    swatch: '#FB923C',
    accent: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.22)',
    bgDark: 'rgba(249, 115, 22, 0.35)',
    badgeBgLight: 'rgba(249, 115, 22, 0.12)',
    badgeTextLight: '#C2410C',
    badgeTextDark: '#FB923C',
  },
  {
    id: 'pink',
    name: 'Rosa',
    swatch: '#F472B6',
    accent: '#EC4899',
    bgLight: 'rgba(236, 72, 153, 0.22)',
    bgDark: 'rgba(236, 72, 153, 0.35)',
    badgeBgLight: 'rgba(236, 72, 153, 0.12)',
    badgeTextLight: '#BE185D',
    badgeTextDark: '#F472B6',
  },
];

const byId = Object.fromEntries(HIGHLIGHT_PALETTE.map((p) => [p.id, p])) as Record<string, HighlightTheme>;

export function getHighlightTheme(color: string) {
  return byId[color];
}

export function verseHighlightStyle(color: string, isDark: boolean) {
  const t = getHighlightTheme(color);
  if (!t) return {};
  return {
    backgroundColor: isDark ? t.bgDark : t.bgLight,
    borderLeftWidth: 4,
    borderLeftColor: t.accent,
    borderRadius: 6,
    paddingLeft: 8,
  };
}

export function highlightBg(color: string, isDark = false) {
  const t = getHighlightTheme(color);
  return t ? (isDark ? t.bgDark : t.bgLight) : color;
}

export function highlightBadgeStyle(color: string, isDark: boolean) {
  const t = getHighlightTheme(color);
  if (!t) return { backgroundColor: 'transparent', color: isDark ? '#E7E5E4' : '#3D3835' };
  return {
    backgroundColor: isDark ? `${t.accent}22` : t.badgeBgLight,
    color: isDark ? t.badgeTextDark : t.badgeTextLight,
  };
}
