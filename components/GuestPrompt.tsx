import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';

interface GuestPromptProps {
  title: string;
  message: string;
}

export function GuestPrompt({ title, message }: GuestPromptProps) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.card} dashed>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
        {message}
      </Text>
      <Button label="Iniciar sesión" onPress={() => router.push('/login')} fullWidth />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  title: { fontSize: 17, fontWeight: '700' },
});
