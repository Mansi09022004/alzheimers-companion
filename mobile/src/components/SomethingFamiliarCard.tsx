/**
 * "Something familiar" — the emotional centrepiece of Home: the memory in large, warm
 * type on a soft gradient with a botanical accent. Tapping the card reads it aloud again.
 * Real data only, from /patient/memory-moment.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { MemoryMoment } from '../api/context';
import { theme } from '../theme';

export function SomethingFamiliarCard({
  moment,
  loading,
  firstName,
  onPress,
}: {
  moment: MemoryMoment | null;
  loading: boolean;
  firstName: string;
  onPress: () => void;
}) {
  const available = !!moment?.available;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      accessibilityRole="button"
      accessibilityLabel={available ? 'Something familiar. Tap to hear it again.' : 'Something familiar'}
    >
      <LinearGradient
        colors={['#FBE4E6', '#F3ECF6', '#E3EFDF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Botanical accent, tucked into the corner so the text always has room. */}
        <Svg viewBox="0 0 120 120" style={styles.leaves} pointerEvents="none">
          <Path d="M60 116 C58 70 84 36 116 22 C114 66 92 102 60 116 Z" fill={theme.colors.sage} fillOpacity={0.28} />
          <Path d="M60 116 C60 78 38 50 6 44 C10 84 32 108 60 116 Z" fill={theme.colors.teal} fillOpacity={0.24} />
          <Path d="M60 116 C58 92 68 72 88 60 C88 86 78 104 60 116 Z" fill={theme.colors.peach} fillOpacity={0.4} />
        </Svg>

        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="heart" size={15} color={theme.colors.accent} />
            <Text style={styles.badgeText}>Something familiar</Text>
          </View>
          <Text style={styles.forYou}>for {firstName}</Text>
        </View>

        {loading ? (
          <View style={styles.skeleton} />
        ) : (
          <View style={styles.quoteRow}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.message}>
              {available ? moment!.message : 'Nothing new to share right now. Your family can add a memory anytime.'}
            </Text>
          </View>
        )}

      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radiusLg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.pink + '30',
    ...theme.shadow.soft,
  },
  gradient: { padding: theme.spacing(2.25), gap: theme.spacing(1.5), overflow: 'hidden' },
  leaves: { position: 'absolute', right: -6, bottom: -8, width: 130, height: 130 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
  },
  badgeText: { fontFamily: theme.font.bold, fontSize: 15, color: theme.colors.text, letterSpacing: 0.2 },
  forYou: { fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.textMuted },
  quoteRow: { flexDirection: 'row', gap: 6, paddingRight: 8 },
  quoteMark: { fontFamily: theme.font.bold, fontSize: 56, lineHeight: 52, color: theme.colors.accent, opacity: 0.55, marginTop: -2 },
  message: { flex: 1, fontFamily: theme.font.bold, fontSize: 26, lineHeight: 34, color: theme.colors.text, paddingTop: 2 },
  skeleton: { height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.6)' },
});
