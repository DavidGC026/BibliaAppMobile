import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import type { ProgressBook } from '@/lib/types';

function heatmapColor(count: number, isDark: boolean) {
  if (count <= 0) return isDark ? '#44403C' : '#E7E5E4';
  if (count <= 2) return isDark ? '#78350F' : '#FDE68A';
  if (count <= 5) return isDark ? '#B45309' : '#FBBF24';
  return isDark ? '#F59E0B' : '#D97706';
}

interface ActivityPanelProps {
  compact?: boolean;
  onViewAll?: () => void;
}

export function ActivityPanel({ compact, onViewAll }: ActivityPanelProps) {
  const { colors, isDark } = useAppTheme();
  const [progress, setProgress] = useState<ProgressBook[]>([]);
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getActivity()
      .then(({ heatmap: hm, recentProgress }) => {
        setProgress(recentProgress);
        const days: { date: string; count: number }[] = [];
        const today = new Date();
        const total = compact ? 60 : 100;
        for (let i = total - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const found = hm.find((h) => h.date.split('T')[0] === dateStr);
          days.push({ date: dateStr, count: found ? Number(found.total_chapters) : 0 });
        }
        setHeatmap(days);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [compact]);

  const shown = useMemo(() => (compact ? progress.slice(0, 3) : progress), [compact, progress]);
  const maxChapters = Math.max(50, ...shown.map((p) => p.total_chapters), 1);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  }

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.textMuted }]}>PROGRESO POR LIBRO</Text>
        {shown.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            Aún no hay actividad. Lee un capítulo para empezar.
          </Text>
        ) : (
          shown.map((p) => (
            <View key={p.book_id} style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <Text style={[styles.bookName, { color: colors.text }]} numberOfLines={1}>
                  {p.book_name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {p.total_chapters} cap.
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.min(100, (p.total_chapters / maxChapters) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.textMuted }]}>CALENDARIO DE LECTURA</Text>
        <View style={[styles.heatmap, { backgroundColor: colors.muted }]}>
          {heatmap.map((d) => (
            <View
              key={d.date}
              style={[styles.cell, { backgroundColor: heatmapColor(d.count, isDark) }]}
            />
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>Menos</Text>
          {[0, 2, 5, 6].map((v, i) => (
            <View key={i} style={[styles.legendCell, { backgroundColor: heatmapColor(v, isDark) }]} />
          ))}
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>Más</Text>
        </View>
      </Card>

      {compact && onViewAll ? (
        <Pressable onPress={onViewAll}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>Ver actividad completa →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: { gap: 12 },
  heading: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  progressRow: { gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  bookName: { flex: 1, fontSize: 14, fontWeight: '600' },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, padding: 10, borderRadius: 10 },
  cell: { width: 12, height: 12, borderRadius: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  viewAll: { textAlign: 'center', fontWeight: '700', fontSize: 13, paddingVertical: 4 },
});
