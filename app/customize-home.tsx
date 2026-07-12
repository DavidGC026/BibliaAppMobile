import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import {
  DEFAULT_HOME_ACTIONS,
  HOME_ACTION_CATALOG,
  getHomeActions,
  saveHomeActions,
  type HomeActionKey,
} from '@/lib/homeActions';

export default function CustomizeHomeScreen() {
  const { colors, typography } = useAppTheme();
  const contentPadding = useContentPadding();
  const [enabled, setEnabled] = useState<HomeActionKey[] | null>(null);

  useEffect(() => {
    getHomeActions().then(setEnabled);
  }, []);

  const toggle = (key: HomeActionKey) => {
    setEnabled((current) => {
      const list = current ?? DEFAULT_HOME_ACTIONS;
      const isOn = list.includes(key);
      if (isOn && list.length <= 1) return list;
      const next = isOn ? list.filter((k) => k !== key) : [...list, key];
      const ordered = HOME_ACTION_CATALOG.map((a) => a.key).filter((k) => next.includes(k));
      saveHomeActions(ordered).catch(() => {});
      return ordered;
    });
  };

  if (!enabled) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: contentPadding }]}
    >
      <Text style={[typography.h1, { color: colors.text }]}>Accesos rápidos</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Elige qué tarjetas quieres ver en la sección "Acciones rápidas" de Inicio.
      </Text>

      <Card style={styles.card}>
        {HOME_ACTION_CATALOG.map((action, index) => (
          <View key={action.key}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
                <SymbolView name={action.icon} tintColor={colors.primary} size={18} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.title, { color: colors.text }]}>{action.title}</Text>
                <Text style={[styles.desc, { color: colors.textMuted }]}>{action.description}</Text>
              </View>
              <Switch
                value={enabled.includes(action.key)}
                onValueChange={() => toggle(action.key)}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 16 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 12, lineHeight: 16 },
});
