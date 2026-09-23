/**
 * The patient device's small "Settings" menu — reached from the gear icon on Home.
 * A real in-app modal, not `Alert.alert`: react-native-web stubs that out as a
 * complete no-op, so it silently does nothing on web/PWA builds (see ConfirmDialog).
 */
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function SettingsDialog({
  visible,
  onClose,
  onSwitchRole,
  onUnpair,
}: {
  visible: boolean;
  onClose: () => void;
  onSwitchRole: () => void;
  onUnpair: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close settings">
        {/* Swallow taps on the card itself so they don't fall through to the backdrop. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Settings</Text>

          <Pressable onPress={onSwitchRole} style={styles.row} accessibilityRole="button" accessibilityLabel="Switch role">
            <View style={[styles.rowIcon, { backgroundColor: theme.colors.primaryTint }]}>
              <Ionicons name="swap-horizontal" size={20} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.rowLabel}>Switch role</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </Pressable>

          <Pressable onPress={onUnpair} style={styles.row} accessibilityRole="button" accessibilityLabel="Unpair device">
            <View style={[styles.rowIcon, { backgroundColor: theme.colors.dangerTint }]}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            </View>
            <Text style={[styles.rowLabel, styles.dangerLabel]}>Unpair device</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.danger} />
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancelButton} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,38,32,0.45)', alignItems: 'center', justifyContent: 'center', padding: theme.spacing(3) },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusLg,
    padding: theme.spacing(2.5),
    gap: theme.spacing(0.5),
    ...theme.shadow.soft,
  },
  title: { fontFamily: theme.font.bold, fontSize: theme.fontSize.title, color: theme.colors.text, marginBottom: theme.spacing(0.5) },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.25), minHeight: 56 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontFamily: theme.font.bold, fontSize: 17, color: theme.colors.text },
  dangerLabel: { color: theme.colors.danger },
  cancelButton: { marginTop: theme.spacing(1), minHeight: 52, borderRadius: theme.radius, backgroundColor: theme.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.text },
});
