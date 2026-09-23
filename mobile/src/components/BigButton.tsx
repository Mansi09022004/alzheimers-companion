import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
};

const BG = { primary: theme.colors.primary, accent: theme.colors.accent, danger: theme.colors.danger };
const TEXT = { primary: theme.colors.primaryText, accent: theme.colors.accentText, danger: theme.colors.dangerText };

/** Large, high-contrast button with a comfortable touch target (min ~68pt tall). */
export function BigButton({ label, onPress, variant = 'primary', icon, loading, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: BG[variant], opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={TEXT[variant]} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={26} color={TEXT[variant]} style={styles.icon} />}
          <Text style={[styles.label, { color: TEXT[variant] }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 72,
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 10 },
  label: {
    fontFamily: theme.font.bold,
    fontSize: theme.fontSize.button,
    textAlign: 'center',
  },
});
