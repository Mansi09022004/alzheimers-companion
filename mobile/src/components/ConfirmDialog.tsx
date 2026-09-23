/** A calm, in-app dialog — replaces Alert.alert, which doesn't render on web. */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Not now',
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable>
            {onConfirm && (
              <Pressable
                onPress={onConfirm}
                style={[styles.button, destructive ? styles.dangerButton : styles.primaryButton]}
              >
                <Text style={styles.confirmLabel}>{confirmLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,38,32,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusLg,
    padding: theme.spacing(3),
    ...theme.shadow.soft,
  },
  title: { fontFamily: theme.font.bold, fontSize: theme.fontSize.title, color: theme.colors.text },
  message: { marginTop: theme.spacing(1), fontFamily: theme.font.regular, fontSize: theme.fontSize.body, color: theme.colors.textMuted, lineHeight: 26 },
  actions: { marginTop: theme.spacing(3), flexDirection: 'row', gap: theme.spacing(1.5) },
  button: { flex: 1, borderRadius: theme.radius, paddingVertical: theme.spacing(1.75), alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: theme.colors.surfaceMuted },
  primaryButton: { backgroundColor: theme.colors.primary },
  dangerButton: { backgroundColor: theme.colors.danger },
  cancelLabel: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.text },
  confirmLabel: { fontFamily: theme.font.bold, fontSize: 16, color: '#FFFFFF' },
});
