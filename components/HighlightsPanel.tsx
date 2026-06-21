import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GuestPrompt } from '@/components/GuestPrompt';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import { HIGHLIGHT_PALETTE, highlightBadgeStyle, verseHighlightStyle } from '@/lib/highlightColors';
import type { HighlightItem } from '@/lib/types';

function openInReader(h: HighlightItem) {
  router.navigate({
    pathname: '/(tabs)/bible',
    params: {
      bookId: String(h.book_id),
      chapter: String(h.chapter),
      bibleId: String(h.bible_id),
      mode: 'reader',
    },
  });
}

interface HighlightsPanelProps {
  compact?: boolean;
  onViewAll?: () => void;
}

export function HighlightsPanel({ compact, onViewAll }: HighlightsPanelProps) {
  const { colors, radius, isDark } = useAppTheme();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [activeColor, setActiveColor] = useState('yellow');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(async () => {
    const [{ highlights: list }, { categories: cats }] = await Promise.all([
      api.getAllHighlights(),
      api.getHighlightCategories(),
    ]);
    setHighlights(list);
    setCategories(cats);
  }, []);

  useEffect(() => {
    if (authLoading || isGuest) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [authLoading, isGuest, load]);

  const filtered = highlights.filter((h) => h.color === activeColor);
  const defaultName = HIGHLIGHT_PALETTE.find((c) => c.id === activeColor)?.name ?? 'Categoría';
  const categoryName = categories[activeColor] || defaultName;
  const activeSwatch = HIGHLIGHT_PALETTE.find((c) => c.id === activeColor)?.swatch ?? colors.primary;
  const shown = compact ? filtered.slice(0, 3) : filtered;

  const saveCategory = async () => {
    const name = editName.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      await api.saveHighlightCategory(activeColor, name);
      setEditing(false);
      await load();
    } finally {
      setSavingCat(false);
    }
  };

  const remove = (h: HighlightItem) => {
    Alert.alert('Quitar subrayado', '¿Eliminar este subrayado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.setHighlights(h.book_id, h.chapter, [h.verse], null, h.bible_id);
          await load();
        },
      },
    ]);
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <GuestPrompt
        title="Subrayados"
        message="Inicia sesión para ver y organizar tus versículos subrayados."
      />
    );
  }

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />;
  }

  if (compact) {
    const recent = [...highlights].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ).slice(0, 3);
    if (recent.length === 0) {
      return (
        <Card style={styles.emptyCompact} dashed>
          <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
            Aún no tienes versículos subrayados.
          </Text>
        </Card>
      );
    }
    return (
      <View style={styles.list}>
        {recent.map((h) => {
          const badge = highlightBadgeStyle(h.color, isDark);
          return (
            <Pressable
              key={h.id}
              style={[
                styles.highlightItem,
                { borderColor: colors.border },
                verseHighlightStyle(h.color, isDark),
              ]}
              onPress={() => openInReader(h)}
            >
              <View style={[styles.refBadge, { backgroundColor: badge.backgroundColor }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: badge.color }}>
                  {h.book_name} {h.chapter}:{h.verse}
                </Text>
              </View>
              <Text style={[styles.highlightText, { color: colors.text }]} numberOfLines={2}>
                "{h.text}"
              </Text>
            </Pressable>
          );
        })}
        {highlights.length > 3 && onViewAll ? (
          <Pressable onPress={onViewAll} style={styles.viewAll}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              Ver todos ({highlights.length}) →
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
        {HIGHLIGHT_PALETTE.map((c) => {
          const active = activeColor === c.id;
          const count = highlights.filter((h) => h.color === c.id).length;
          const label = categories[c.id] || c.name;
          return (
            <Pressable
              key={c.id}
              style={[
                styles.colorChip,
                {
                  borderRadius: radius.lg,
                  borderColor: active ? c.swatch : colors.border,
                  backgroundColor: active ? `${c.swatch}18` : colors.card,
                },
              ]}
              onPress={() => {
                setActiveColor(c.id);
                setEditing(false);
              }}
            >
              <View style={[styles.dot, { backgroundColor: c.swatch }]} />
              <Text style={{ color: active ? colors.text : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
                {label}
              </Text>
              <Text style={[styles.count, { color: colors.textMuted, backgroundColor: colors.muted }]}>{count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={styles.listCard}>
        <View style={[styles.catHeader, { borderBottomColor: colors.border }]}>
          <View style={[styles.dotLg, { backgroundColor: activeSwatch }]} />
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.editInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.md }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre de categoría"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <Pressable onPress={saveCategory} disabled={savingCat}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>✓</Text>
              </Pressable>
              <Pressable onPress={() => setEditing(false)}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.catTitleRow}
              onPress={() => {
                setEditName(categoryName);
                setEditing(true);
              }}
            >
              <Text style={[styles.catTitle, { color: colors.text }]}>{categoryName}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Renombrar</Text>
            </Pressable>
          )}
        </View>

        {shown.length === 0 ? (
          <View style={styles.emptyInner}>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14 }}>
              No tienes versículos subrayados con este color.
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13, marginTop: 4 }}>
              Ve al Lector, selecciona un versículo y elige un color.
            </Text>
          </View>
        ) : (
          shown.map((h) => {
            const badge = highlightBadgeStyle(h.color, isDark);
            return (
              <Pressable
                key={h.id}
                style={[
                  styles.highlightItem,
                  { borderColor: colors.border },
                  verseHighlightStyle(h.color, isDark),
                ]}
                onPress={() => openInReader(h)}
              >
                <View style={styles.highlightHeader}>
                  <View style={[styles.refBadge, { backgroundColor: badge.backgroundColor }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: badge.color }}>
                      {h.book_name} {h.chapter}:{h.verse}
                      {h.bible_abbr ? ` (${h.bible_abbr})` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => remove(h)} hitSlop={8}>
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Quitar</Text>
                  </Pressable>
                </View>
                <Text style={[styles.highlightText, { color: colors.text }]}>"{h.text}"</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>
                  {new Date(h.created_at).toLocaleDateString('es')}
                </Text>
              </Pressable>
            );
          })
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { gap: 12 },
  colorRow: { gap: 8, paddingVertical: 4 },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotLg: { width: 16, height: 16, borderRadius: 8 },
  count: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  listCard: { gap: 12 },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catTitle: { fontSize: 20, fontWeight: '800' },
  editRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  editInput: { flex: 1, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  emptyInner: { paddingVertical: 32 },
  emptyCompact: { paddingVertical: 24 },
  list: { gap: 12 },
  highlightItem: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  highlightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  refBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  highlightText: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  viewAll: { alignItems: 'center', paddingVertical: 8 },
});
