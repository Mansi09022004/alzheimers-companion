/** The central "Ask me" companion interaction — a warm glowing orb, not a rectangle. */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function AskOrb({
  label,
  sublabel,
  icon = 'mic',
  active = false,
  size = 96,
  onPress,
}: {
  label: string;
  sublabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  size?: number;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ringBox,
          { width: size * 1.7, height: size * 1.7, borderRadius: size, transform: [{ scale: pulse }] },
          active && styles.ringActive,
        ]}
      >
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <Ionicons name={icon} size={size * 0.38} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
      {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  // Tint via rgba, not `opacity`: opacity on the ring would also wash out the orb inside it.
  ringBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220,238,236,0.65)' },
  ringActive: { backgroundColor: theme.colors.dangerTint },
  orb: { alignItems: 'center', justifyContent: 'center', ...theme.shadow.soft },
  label: { marginTop: theme.spacing(1.5), fontFamily: theme.font.bold, fontSize: theme.fontSize.button, color: theme.colors.text },
  sublabel: { marginTop: 4, fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.textMuted, textAlign: 'center' },
});
