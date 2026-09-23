/** Write (or speak) about one specific day, and save it. */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveJournalEntry, transcribeForJournal } from '../api/journal';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import type { JournalStackParamList } from '../navigation';
import { theme } from '../theme';

type Props = NativeStackScreenProps<JournalStackParamList, 'JournalEntry'>;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function JournalEntryScreen({ route, navigation }: Props) {
  const { entryDate, initialText } = route.params;
  const { token } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);

  const startRecording = async () => {
    setError(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is needed to speak your entry.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
    } catch {
      setError("I couldn't start the microphone. Please check it is allowed, or type your entry instead.");
      setStatus('idle');
    }
  };

  const stopRecording = async () => {
    setStatus('transcribing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !token) return setStatus('idle');
      const heard = await transcribeForJournal(uri, token);
      if (heard) {
        setText((prev) => (prev ? `${prev} ${heard}` : heard));
      } else {
        // The server returns an empty transcript when it couldn't understand (or reach) speech-to-text.
        setError("Sorry, I couldn't hear that. Please try again, or type your entry.");
      }
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sorry, I couldn't hear that.");
      setStatus('idle');
    }
  };

  const save = async () => {
    if (!token || !text.trim()) return;
    setStatus('saving');
    setError(null);
    try {
      await saveJournalEntry(entryDate, text.trim(), token);
      navigation.goBack();
    } catch {
      setError('Could not save. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <Screen showHelp background={theme.day.background}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.date}>{formatDate(entryDate)}</Text>
        <Text style={styles.prompt}>What happened today? How did you feel?</Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write about your day…"
          style={styles.input}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Your journal entry"
        />

        <View style={styles.micRow}>
          <BigButton
            label={status === 'recording' ? 'Stop' : status === 'transcribing' ? 'Listening…' : 'Speak instead'}
            icon={status === 'recording' ? 'stop' : 'mic'}
            variant={status === 'recording' ? 'danger' : 'primary'}
            onPress={status === 'recording' ? stopRecording : status === 'idle' ? startRecording : () => {}}
            loading={status === 'transcribing'}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ height: theme.spacing(1) }} />
        <BigButton label="Save" icon="checkmark" onPress={save} loading={status === 'saving'} disabled={!text.trim()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(6) },
  date: { fontFamily: theme.font.bold, fontSize: theme.fontSize.title, color: theme.colors.text },
  prompt: { fontFamily: theme.font.regular, fontSize: theme.fontSize.body, color: theme.colors.textMuted },
  input: {
    borderWidth: 2,
    borderColor: theme.day.accent + '40',
    borderRadius: theme.radius,
    padding: theme.spacing(2),
    fontSize: theme.fontSize.body,
    minHeight: 220,
    backgroundColor: theme.day.card,
    color: theme.colors.text,
    lineHeight: 28,
  },
  micRow: { alignItems: 'center' },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.body, textAlign: 'center' },
});
