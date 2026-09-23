import { Image, StyleSheet, Text, View } from 'react-native';

import { API_URL } from '../config';
import { theme } from '../theme';

const TONES = [
  { bg: theme.colors.primaryTint, fg: theme.colors.primaryDark },
  { bg: theme.colors.accentTint, fg: theme.colors.accent },
  { bg: theme.colors.lavenderTint, fg: theme.colors.lavender },
  { bg: theme.colors.sageTint, fg: theme.colors.sage },
  { bg: theme.colors.peachTint, fg: '#B5652E' },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % TONES.length;
  return TONES[hash];
}

/**
 * Initials avatar — this app never stores or shows real photos of people (face
 * recognition keeps embeddings only), so a warm, distinct initials circle is the
 * honest way to represent someone familiar.
 */
export function PersonAvatar({
  name,
  size = 56,
  photoUrl,
}: {
  name: string;
  size?: number;
  photoUrl?: string | null;
}) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl.startsWith('http') ? photoUrl : `${API_URL}${photoUrl}` }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  const tone = toneFor(name);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36, color: tone.fg }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: theme.font.bold },
});
