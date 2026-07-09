import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { GuestPrompt } from '@/components/GuestPrompt';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { BOOK_CATEGORY_LEGEND, getBookCategoryColor } from '@/lib/bookStatColors';
import type { BookStat } from '@/lib/types';

interface StatisticsPanelProps {
  compact?: boolean;
  onViewAll?: () => void;
}

export function StatisticsPanel({ compact, onViewAll }: StatisticsPanelProps) {
  const { colors } = useAppTheme();
  const { isGuest } = useAuth();
  const [stats, setStats] = useState<BookStat[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getStatistics()
      .then(({ statistics }) => setStats(statistics))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const chartData = useMemo(() => {
    const all = Array.from({ length: 66 }, (_, i) => ({
      book_id: i + 1,
      chapters: 0,
      color: getBookCategoryColor(i + 1),
    }));
    stats.forEach((s) => {
      const idx = s.book_id - 1;
      if (all[idx]) all[idx].chapters = Number(s.total_chapters);
    });
    return compact ? all.filter((b) => b.chapters > 0).slice(0, 12) : all;
  }, [stats, compact]);

  if (isGuest) {
    return (
      <GuestPrompt
        title="Estadísticas"
        message="Inicia sesión para ver cuántos capítulos has leído por libro."
      />
    );
  }

  const maxVal = Math.max(1, ...chartData.map((b) => b.chapters));
  const totalChapters = stats.reduce((sum, s) => sum + Number(s.total_chapters), 0);
  const booksRead = stats.filter((s) => Number(s.total_chapters) > 0).length;

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{totalChapters}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Capítulos leídos</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{booksRead}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Libros con progreso</Text>
        </Card>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.textMuted }]}>CAPÍTULOS POR LIBRO</Text>
        {chartData.every((b) => b.chapters === 0) ? (
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>
            Sin datos todavía. Lee capítulos para ver tu gráfica.
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chart}>
            {chartData.map((b) => (
              <View key={b.book_id} style={styles.barCol}>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <View
                    style={{
                      width: '100%',
                      height: `${Math.max(4, (b.chapters / maxVal) * 100)}%`,
                      backgroundColor: b.color,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.textMuted }]}>L{b.book_id}</Text>
              </View>
            ))}
          </ScrollView>
        )}
        {!compact ? (
          <View style={styles.legend}>
            {BOOK_CATEGORY_LEGEND.map(({ label, color }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {compact && onViewAll ? (
        <Pressable onPress={onViewAll}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>Ver estadísticas completas →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },
  card: { gap: 12 },
  heading: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  chart: { alignItems: 'flex-end', gap: 4, paddingVertical: 8, minHeight: 140 },
  barCol: { alignItems: 'center', width: 18 },
  barTrack: { width: 14, height: 100, borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  barLabel: { fontSize: 8, marginTop: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  viewAll: { textAlign: 'center', fontWeight: '700', fontSize: 13, paddingVertical: 4 },
});
