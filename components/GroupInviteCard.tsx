import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Image, Pressable, Share, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { buildGroupJoinUrl, buildGroupQrImageUrl } from '@/lib/groupInvite';

export function GroupInviteCard({
  groupId,
  inviteCode,
  isAdmin,
  onCodeChange,
}: {
  groupId: number;
  inviteCode?: string | null;
  isAdmin: boolean;
  onCodeChange?: (code: string) => void;
}) {
  const { colors, radius } = useAppTheme();
  const code = inviteCode?.toUpperCase() ?? '';
  const joinUrl = code ? buildGroupJoinUrl(code, API_BASE_URL) : '';
  const qr = joinUrl ? buildGroupQrImageUrl(joinUrl, 240) : '';
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('Código copiado', code);
  };

  const share = async () => {
    if (!joinUrl) return;
    await Share.share({ message: `Únete a nuestro grupo en BibliaAPP:\n${joinUrl}` });
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const { invite_code } = await api.regenerateGroupInvite(groupId);
      onCodeChange?.(invite_code);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo regenerar');
    } finally {
      setBusy(false);
    }
  };

  if (!code) {
    return (
      <Card>
        <Text style={{ color: colors.textMuted }}>Este grupo aún no tiene código de invitación.</Text>
      </Card>
    );
  }

  return (
    <Card style={{ gap: 12, alignItems: 'center' }}>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Invitar</Text>
      {qr ? <Image source={{ uri: qr }} style={styles.qr} /> : null}
      <Pressable onPress={() => void copy()} style={[styles.code, { borderColor: colors.border, borderRadius: radius.lg }]}>
        <Text style={{ color: colors.primary, fontWeight: '800', letterSpacing: 2, fontSize: 18 }}>{code}</Text>
      </Pressable>
      <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
        Comparte el código o el QR. Quien lo abra se une al grupo.
      </Text>
      <Button label="Compartir enlace" onPress={() => void share()} fullWidth />
      {isAdmin ? (
        <Button label="Regenerar código" variant="outline" onPress={() => void regenerate()} loading={busy} fullWidth />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  qr: { width: 200, height: 200 },
  code: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
});
