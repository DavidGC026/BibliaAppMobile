import { Href, Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { parseGroupJoinCode } from '@/lib/groupInvite';

export default function ScanGroupScreen() {
  const { colors } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24, gap: 16 }]}>
        <Stack.Screen options={{ title: 'Escanear QR' }} />
        <Text style={{ color: colors.text, textAlign: 'center', fontSize: 16 }}>
          BibliaAPP usa la cámara solo para leer el código QR de un grupo.
        </Text>
        <Button label="Permitir cámara" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ title: 'Escanear QR' }} />
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const code = parseGroupJoinCode(data);
          if (!code) return;
          handled.current = true;
          router.replace(`/join-group?code=${code}` as Href);
        }}
      />
      <View style={styles.hint}>
        <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '700' }}>
          Enfoca el QR de invitación del grupo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
