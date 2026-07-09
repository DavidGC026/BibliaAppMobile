import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
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
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';

const logo = require('@/assets/images/icon.png');

function finishLogin() {
  // Tras OAuth el stack queda raro; replace evita volver al modal de login.
  router.replace('/(tabs)');
}

export default function LoginScreen() {
  const { colors, typography, radius, shadow } = useAppTheme();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = loading || googleLoading;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Correo y contraseña son obligatorios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await loginWithGoogle();
      finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Image source={logo} style={[styles.logo, shadow.md]} resizeMode="contain" />
        <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>Iniciar sesión</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Usa la misma cuenta que en la web de tu congregación.
        </Text>

        <Card style={styles.form}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, borderRadius: radius.lg },
            ]}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, borderRadius: radius.lg },
            ]}
            placeholder="Contraseña"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            onPress={() => router.push('/forgot-password')}
            style={styles.forgotContainer}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Button label="Entrar" onPress={handleLogin} loading={loading} disabled={busy} fullWidth />

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>o</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={busy}
            style={[
              styles.googleButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[styles.googleLabel, { color: colors.text }]}>
              {googleLoading ? 'Conectando…' : 'Continuar con Google'}
            </Text>
          </Pressable>
        </Card>

        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>Volver</Text>
        </Pressable>
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
  logo: {
    width: 88,
    height: 88,
    alignSelf: 'center',
    borderRadius: 20,
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
  forgotContainer: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  error: { fontSize: 14 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  googleButton: {
    borderWidth: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  back: { alignItems: 'center', paddingVertical: 12 },
});
