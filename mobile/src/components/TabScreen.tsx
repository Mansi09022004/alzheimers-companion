/**
 * Shared frame for the Medicines / Memories / People / My Day tabs: a soft tinted wash,
 * a compact title block, a centred max-width content column (so it also looks right on
 * wide screens), and the compact red help pill pinned bottom-right (content clears it).
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme';
import { HelpButton } from './HelpButton';

export type Accent = { fg: string; tint: string; bg: string };

export const ACCENTS = {
  medicines: { fg: theme.colors.mint, tint: '#DDF0E5', bg: '#EFF7F1' },
  memories: { fg: theme.colors.lavender, tint: '#EDE6F6', bg: '#F8F2F6' },
  people: { fg: '#6F9A5B', tint: '#E2EEDB', bg: '#F1F6EC' },
  day: { fg: theme.day.accent, tint: theme.day.wash, bg: theme.day.background },
} as const satisfies Record<string, Accent>;

export function TabScreen({
  title,
  subtitle,
  icon,
  accent,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: Accent;
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: accent.bg }]} edges={['top']}>
      <LinearGradient colors={[accent.tint, accent.bg]} style={styles.wash} pointerEvents="none" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: accent.fg }]}>
            <Ionicons name={icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
        </View>
        {children}
      </ScrollView>
      {/* Compact standalone help pill, pinned bottom-right; content has bottom padding to clear it. */}
      <View style={styles.help} pointerEvents="box-none">
        <HelpButton />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  scroll: { flex: 1 },
  help: { position: 'absolute', right: theme.spacing(2), bottom: theme.spacing(2) },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    paddingBottom: 104,
    gap: theme.spacing(1.75),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), paddingHorizontal: 2 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...theme.shadow.card },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontFamily: theme.font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3, color: theme.colors.text },
  subtitle: { fontFamily: theme.font.regular, fontSize: 15, lineHeight: 20, color: theme.colors.textMuted, marginTop: 1 },
});
