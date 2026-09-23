/**
 * The central "Ask me" voice-assistant invitation. A confident teal panel with a big mic
 * — the one strongly-coloured, obviously-tappable thing on Home besides Help — kept
 * compact so it doesn't push Today off the screen.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function AskMeCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask me anything"
      style={({ pressed }) => [styles.wrap, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.ringOuter} />
        <View style={styles.ringInner} />

        <View style={styles.mic}>
          <Ionicons name="mic" size={24} color={theme.colors.primaryDark} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Ask me anything</Text>
          <Text style={styles.sub}>Tap and just talk to me.</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: theme.radiusLg, ...theme.shadow.soft },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    borderRadius: theme.radiusLg,
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(1.5),
    minHeight: 64,
    overflow: 'hidden',
  },
  ringOuter: { position: 'absolute', right: -50, top: -60, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.08)' },
  ringInner: { position: 'absolute', right: 10, bottom: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)' },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    flexShrink: 0,
  },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: theme.font.bold, fontSize: 20, color: '#FFFFFF' },
  sub: { fontFamily: theme.font.regular, fontSize: 14, lineHeight: 17, color: 'rgba(255,255,255,0.88)', marginTop: 2 },
});
