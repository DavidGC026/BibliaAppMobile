import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LegalDocContent } from '@/components/LegalDocContent';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as api from '@/lib/api';
import { LEGAL_DOC_ORDER, LEGAL_DOCS, type LegalDocSlug } from '@/lib/legalDocs';
import type { User } from '@/lib/types';

/**
 * Un usuario debe aceptar los documentos legales si su cuenta fue creada
 * antes de que existieran (legalAcceptedAt en null). Las cuentas nuevas
 * aceptan al registrarse. Si el campo aún no se conoce (perfil en caché
 * de una versión anterior), no se bloquea; se resuelve al revalidar.
 */
function needsLegalAcceptance(user: User | null): boolean {
  if (!user) return false;
  return user.legalAcceptedAt === null;
}

/**
 * Modal bloqueante que pide leer y aceptar los términos, las normas de la
 * comunidad y el aviso de privacidad la primera vez que un usuario con
 * aceptación pendiente inicia sesión en el móvil.
 */
export function LegalAcceptanceGate() {
  const { colors, typography } = useAppTheme();
  const { user, refreshUser, logout } = useAuth();

  const [readDocs, setReadDocs] = useState<Partial<Record<LegalDocSlug, boolean>>>({});
  const [openDoc, setOpenDoc] = useState<LegalDocSlug | null>(null);
  const [accepting, setAccepting] = useState(false);

  const visible = needsLegalAcceptance(user);
  const allRead = useMemo(
    () => LEGAL_DOC_ORDER.every((slug) => readDocs[slug]),
    [readDocs],
  );

  if (!visible) return null;

  async function handleAccept() {
    setAccepting(true);
    try {
      await api.acceptLegalTerms();
      await refreshUser();
    } catch (err) {
      Alert.alert(
        'No se pudo registrar tu aceptación',
        err instanceof Error ? err.message : 'Inténtalo de nuevo.',
      );
    } finally {
      setAccepting(false);
    }
  }

  function handleDecline() {
    Alert.alert(
      'Aceptación requerida',
      'Para usar tu cuenta debes aceptar los términos y condiciones, las normas de la comunidad y el aviso de privacidad. Si los rechazas, se cerrará tu sesión.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Rechazar y salir', style: 'destructive', onPress: () => logout() },
      ],
    );
  }

  const currentDoc = openDoc ? LEGAL_DOCS[openDoc] : null;

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={handleDecline}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {currentDoc ? (
          <View style={styles.docView}>
            <ScrollView contentContainerStyle={styles.docContent}>
              <LegalDocContent doc={currentDoc} />
            </ScrollView>
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setReadDocs((prev) => ({ ...prev, [currentDoc.slug]: true }));
                  setOpenDoc(null);
                }}
              >
                <Text style={styles.primaryButtonText}>He leído este documento</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[typography.h1, { color: colors.text }]}>Antes de continuar</Text>
            <Text style={[styles.intro, { color: colors.textMuted }]}>
              Es la primera vez que entras con esta cuenta en la app móvil. Para continuar,
              lee y acepta los siguientes documentos:
            </Text>

            {LEGAL_DOC_ORDER.map((slug) => {
              const doc = LEGAL_DOCS[slug];
              const read = !!readDocs[slug];
              return (
                <Pressable
                  key={slug}
                  onPress={() => setOpenDoc(slug)}
                  style={[styles.docRow, { borderColor: read ? colors.primary : colors.border }]}
                >
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: read ? colors.primary : colors.border,
                        backgroundColor: read ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {read ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docTitle, { color: colors.text }]}>{doc.shortTitle}</Text>
                    <Text style={[styles.docHint, { color: colors.textMuted }]}>
                      {read ? 'Leído' : 'Toca para leer'}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
                </Pressable>
              );
            })}

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
              Al pulsar «Acepto», confirmas que leíste y aceptas los términos y condiciones,
              las normas de la comunidad y el aviso de privacidad.
            </Text>

            <Pressable
              disabled={!allRead || accepting}
              onPress={handleAccept}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: allRead && !accepting ? 1 : 0.45 },
              ]}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Acepto</Text>
              )}
            </Pressable>

            <Pressable onPress={handleDecline} style={styles.declineButton}>
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>No acepto</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 64, gap: 14 },
  intro: { fontSize: 15, lineHeight: 22 },
  docView: { flex: 1 },
  docContent: { padding: 20, paddingTop: 56 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 14 },
  docTitle: { fontSize: 15, fontWeight: '700' },
  docHint: { fontSize: 12, marginTop: 2 },
  disclaimer: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  declineButton: { alignItems: 'center', paddingVertical: 10 },
});
