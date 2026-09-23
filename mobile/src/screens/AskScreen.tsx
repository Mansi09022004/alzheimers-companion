/**
 * "Ask a question" — by voice or by typing.
 *
 * Voice:  tap the mic -> speak -> tap again -> we transcribe, run RAG, show and
 *         speak the answer.
 * Text:   type and press Ask.
 *
 * The answer is shown large; the memories it was based on appear quietly below
 * (source attribution). "I'm not sure" is shown verbatim when not grounded.
 */
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { askQuestion, type AskAnswer } from '../api/ask';
import { askByVoice } from '../api/context';
import { AskOrb } from '../components/AskOrb';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { speak } from '../speech';
import { theme } from '../theme';

type Result = AskAnswer & { transcript?: string };

export function AskScreen() {
  const { token } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'thinking'>('idle');
  const [error, setError] = useState<string | null>(null);

  const show = (r: Result) => {
    setResult(r);
    speak(r.answer);
    setStatus('idle');
  };
  const fail = (e: unknown) => {
    setError(e instanceof Error ? e.message : 'Something went wrong.');
    setStatus('idle');
  };

  const askText = async () => {
    if (!token || !question.trim()) return;
    setStatus('thinking');
    setError(null);
    setResult(null);
    try {
      show(await askQuestion(question.trim(), token));
    } catch (e) {
      fail(e);
    }
  };

  const startRecording = async () => {
    setError(null);
    setResult(null);
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Microphone permission is needed to ask by voice.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('recording');
  };

  const stopRecording = async () => {
    setStatus('thinking');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !token) return setStatus('idle');
      show(await askByVoice(uri, token));
    } catch (e) {
      fail(e);
    }
  };

  return (
    <Screen showHelp>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.orbWrap}>
          <AskOrb
            label={status === 'recording' ? 'Listening…' : status === 'thinking' ? 'Thinking…' : 'Tap to speak'}
            sublabel={status === 'recording' ? 'Tap again when you’re done' : 'Ask about your family, your day…'}
            icon={status === 'recording' ? 'stop' : 'mic'}
            active={status === 'recording'}
            onPress={status === 'recording' ? stopRecording : status === 'idle' ? startRecording : () => {}}
          />
        </View>

        <Text style={styles.or}>or type your question</Text>

        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about your family, your day…"
          style={styles.input}
          multiline
          accessibilityLabel="Your question"
        />
        <BigButton label="Ask" onPress={askText} disabled={!question.trim() || status !== 'idle'} />

        {error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <View style={styles.answerBox}>
            {result.transcript ? (
              <Text style={styles.heard}>You asked: “{result.transcript}”</Text>
            ) : null}
            <Text style={styles.answer}>{result.answer}</Text>
            {result.grounded && result.sources.length > 0 && (
              <View style={styles.sources}>
                <Text style={styles.sourcesLabel}>Based on:</Text>
                {result.sources.map((s) => (
                  <Text key={s.memory_id} style={styles.sourceItem}>
                    • {s.text}
                    {s.memory_date ? `  (${s.memory_date})` : ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(6) },
  orbWrap: { alignItems: 'center', paddingVertical: theme.spacing(3) },
  or: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 15 },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: theme.spacing(2),
    fontSize: theme.fontSize.body,
    minHeight: 80,
    backgroundColor: theme.colors.surfaceWarm,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.body },
  answerBox: {
    backgroundColor: theme.colors.primaryTint,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.primary + '25',
    ...theme.shadow.card,
  },
  heard: { fontSize: 15, color: theme.colors.textMuted, marginBottom: theme.spacing(1), fontStyle: 'italic' },
  answer: { fontSize: theme.fontSize.title, color: theme.colors.text, lineHeight: 36 },
  sources: { marginTop: theme.spacing(3), gap: theme.spacing(1) },
  sourcesLabel: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '700' },
  sourceItem: { fontSize: 15, color: theme.colors.textMuted, lineHeight: 22 },
});
