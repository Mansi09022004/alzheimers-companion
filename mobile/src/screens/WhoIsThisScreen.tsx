/**
 * "Who is this?" flow.
 *
 * States: need-permission -> camera -> sending -> result.
 * On a match we build the result straight from the matched person + their approved
 * memories — name and relationship are always shown; a recent memory is shown only
 * when one actually exists, never invented. On no match: a clearly distinct "I don't
 * recognise this person" state, never a guess.
 */
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { whoIsThis, type WhoIsThis } from '../api/context';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { formatShort } from '../dateUtils';
import { speak } from '../speech';
import { theme } from '../theme';

type Phase = 'camera' | 'sending' | 'result';

export function WhoIsThisScreen() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>('camera');
  const [result, setResult] = useState<WhoIsThis | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!permission) return <Screen center><Text style={styles.body}>Loading camera…</Text></Screen>;

  if (!permission.granted) {
    return (
      <Screen center>
        <Text style={styles.body}>The camera is needed to recognise people.</Text>
        <View style={{ height: theme.spacing(2) }} />
        <BigButton label="Allow camera" onPress={requestPermission} />
      </Screen>
    );
  }

  const takeAndIdentify = async () => {
    setError(null);
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6, skipProcessing: true });
    if (!photo?.uri || !token) return;
    setPhase('sending');
    try {
      const r = await whoIsThis(photo.uri, token);
      setResult(r);
      if (r.matched) {
        const recent = r.sources[0];
        speak(recent ? `This is ${r.display_name}, your ${r.relationship_label}. ${recent.text}` : `This is ${r.display_name}, your ${r.relationship_label}.`);
      } else {
        speak("I don't recognise this person. You could ask a family member.");
      }
      setPhase('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('camera');
    }
  };

  if (phase === 'result' && result) {
    return (
      <Screen center={!result.matched}>
        {result.matched ? (
          <ScrollView style={styles.scrollFill} contentContainerStyle={styles.matchedContent} showsVerticalScrollIndicator={false}>
            <View style={styles.resultCard}>
              <View style={styles.matchIcon}>
                <Ionicons name="person" size={28} color={theme.colors.primaryDark} />
              </View>
              <Text style={styles.result}>
                This is {result.display_name}, your {result.relationship_label}.
              </Text>
            </View>
            {result.sources.length > 0 ? (
              <View style={styles.memoriesBlock}>
                <Text style={styles.memoriesLabel}>Recent memories with {result.display_name}</Text>
                {result.sources.slice(0, 3).map((m) => (
                  <View key={m.memory_id} style={styles.memoryRow}>
                    <Ionicons name="heart" size={16} color={theme.colors.pink} style={styles.memoryIcon} />
                    <View style={styles.memoryText}>
                      <Text style={styles.memoryBody}>{m.text}</Text>
                      {m.memory_date && <Text style={styles.memoryDate}>{formatShort(m.memory_date)}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noMemories}>No memories recorded with {result.display_name} yet.</Text>
            )}
          </ScrollView>
        ) : (
          <View style={styles.unknownCard}>
            <View style={styles.unknownIcon}>
              <Ionicons name="help" size={28} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.unknownTitle}>I don't recognise this person</Text>
            <Text style={styles.unknownSub}>You could ask a family member.</Text>
          </View>
        )}
        <View style={{ height: theme.spacing(3) }} />
        <BigButton
          label="Check another person"
          onPress={() => {
            setResult(null);
            setPhase('camera');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <BigButton
        label={phase === 'sending' ? 'Looking…' : 'Take photo'}
        onPress={takeAndIdentify}
        loading={phase === 'sending'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    flex: 1,
    borderRadius: theme.radius,
    overflow: 'hidden',
    marginBottom: theme.spacing(2),
    backgroundColor: '#000',
  },
  body: { fontSize: theme.fontSize.body, color: theme.colors.text, textAlign: 'center' },
  resultCard: {
    backgroundColor: theme.colors.primaryTint,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '25',
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    ...theme.shadow.card,
  },
  result: {
    marginTop: theme.spacing(1.5),
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  matchIcon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollFill: { flex: 1, width: '100%' },
  matchedContent: { paddingBottom: theme.spacing(2) },

  memoriesBlock: {
    marginTop: theme.spacing(2.5),
    backgroundColor: theme.colors.pinkTint,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.pink + '30',
    padding: theme.spacing(2),
    gap: theme.spacing(1.25),
  },
  memoriesLabel: { fontFamily: theme.font.bold, fontSize: 16, color: theme.colors.text },
  memoryRow: { flexDirection: 'row', gap: theme.spacing(1) },
  memoryIcon: { marginTop: 3 },
  memoryText: { flex: 1 },
  memoryBody: { fontFamily: theme.font.regular, fontSize: 17, lineHeight: 24, color: theme.colors.text },
  memoryDate: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  noMemories: {
    marginTop: theme.spacing(2),
    fontFamily: theme.font.regular,
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  unknownCard: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing(3.5),
    paddingHorizontal: theme.spacing(3),
  },
  unknownIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1),
  },
  unknownTitle: { fontFamily: theme.font.bold, fontSize: theme.fontSize.title, color: theme.colors.text, textAlign: 'center' },
  unknownSub: { fontFamily: theme.font.regular, fontSize: theme.fontSize.body, color: theme.colors.textMuted, textAlign: 'center' },

  error: { color: theme.colors.danger, fontSize: theme.fontSize.body, marginBottom: theme.spacing(1) },
});
