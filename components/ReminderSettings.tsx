import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  DEFAULT_REMINDER_PREFERENCES,
  getReminderPreferences,
  saveReminderPreferences,
  type ReminderPreferences,
} from '@/lib/reminderPreferences';

const ROWS: { key: keyof ReminderPreferences; label: string; description: string }[] = [
  { key: 'streakReminder', label: 'Racha de lectura', description: 'Avisa a las 20:00 si aún no leíste hoy.' },
  { key: 'devotionalReminder', label: 'Devocional pendiente', description: 'Avisa a las 21:00 si no escribiste en tu diario hoy.' },
  { key: 'downloadsReminder', label: 'Descargas incompletas', description: 'Avisa si hay descargas offline fallidas por reintentar.' },
];

export function ReminderSettings() {
  const { colors } = useAppTheme();
  const [prefs, setPrefs] = useState<ReminderPreferences>(DEFAULT_REMINDER_PREFERENCES);

  useEffect(() => {
    getReminderPreferences().then(setPrefs);
  }, []);

  const toggle = (key: keyof ReminderPreferences) => {
    setPrefs((current) => {
      const next = { ...current, [key]: !current[key] };
      saveReminderPreferences(next).catch(() => {});
      return next;
    });
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: colors.text }]}>Recordatorios</Text>
      {ROWS.map((row, index) => (
        <View key={row.key}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.label, { color: colors.text }]}>{row.label}</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>{row.description}</Text>
            </View>
            <Switch value={prefs[row.key]} onValueChange={() => toggle(row.key)} trackColor={{ true: colors.primary }} />
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  label: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 12, lineHeight: 16 },
});
