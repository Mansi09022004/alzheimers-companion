import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
};

/** Large, high-contrast button with a comfortable touch target (min ~64pt tall). */
export function BigButton({ label, onPress, variant = 'primary', loading, disabled }: Props) {
  const bg = variant === 'danger' ? theme.colors.danger : theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primaryText} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 68,
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: theme.colors.primaryText,
    fontSize: theme.fontSize.button,
    fontWeight: '700',
    textAlign: 'center',
  },
});
