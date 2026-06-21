import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { needsAuthHeaders, resolveMediaUrl } from '@/lib/media';

interface AuthedImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch';
}

export function AuthedImage({ uri, style, resizeMode = 'cover' }: AuthedImageProps) {
  const colors = useThemeColors();
  const { token } = useAuth();
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(uri);

  if (!resolved || failed) {
    return <View style={[style, styles.placeholder, { backgroundColor: colors.border }]} />;
  }

  const isDataUri = resolved.startsWith('data:');
  const source =
    !isDataUri && needsAuthHeaders(resolved) && token
      ? { uri: resolved, headers: { Authorization: `Bearer ${token}` } }
      : { uri: resolved };

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

export function AuthedImageLoader(props: AuthedImageProps) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);

  return (
    <View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ position: 'absolute', alignSelf: 'center', top: '40%' }} />
      ) : null}
      <AuthedImage {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {},
});
