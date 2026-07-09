import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppTheme } from '@/hooks/useAppTheme';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const { colors, typography, radius } = useAppTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendLink = async () => {
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>
          {success ? '¡Enlace enviado!' : 'Recuperar acceso'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {success
            ? 'Si la dirección ingresada está registrada, recibirás un enlace de restablecimiento a la brevedad.'
            : 'Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.'}
        </Text>

        <Card style={styles.form}>
          {!success ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderRadius: radius.lg,
                  },
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />

              {error ? (
                <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
              ) : null}

              <Button
                label="Enviar enlace"
                onPress={handleSendLink}
                loading={loading}
                fullWidth
              />
            </>
          ) : (
            <Button
              label="Volver a iniciar sesión"
              onPress={() => router.back()}
              fullWidth
            />
          )}
        </Card>

        {!success && (
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>Volver</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: { fontSize: 14 },
  back: { alignItems: 'center', paddingVertical: 12 },
});
