/**
 * "Ask a question" — type a question, get a calm answer grounded in approved memories.
 *
 * We show the answer big and, quietly below it, the memories it was based on
 * (source attribution). If the assistant isn't sure, it says so.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { askQuestion, type AskAnswer } from '../api/ask';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

export function AskScreen() {
  const { token } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAsk = async () => {
    if (!token || !question.trim()) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      setAnswer(await askQuestion(question.trim(), token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about your family, your day…"
          style={styles.input}
          multiline
          accessibilityLabel="Your question"
        />
        <BigButton label={busy ? 'Thinking…' : 'Ask'} onPress={onAsk} loading={busy} disabled={!question.trim()} />

        {error && <Text style={styles.error}>{error}</Text>}

        {answer && (
          <View style={styles.answerBox}>
            <Text style={styles.answer}>{answer.answer}</Text>
            {answer.grounded && answer.sources.length > 0 && (
              <View style={styles.sources}>
                <Text style={styles.sourcesLabel}>Based on:</Text>
                {answer.sources.map((s) => (
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
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: theme.spacing(2),
    fontSize: theme.fontSize.body,
    minHeight: 90,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.body },
  answerBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  answer: { fontSize: theme.fontSize.title, color: theme.colors.text, lineHeight: 36 },
  sources: { marginTop: theme.spacing(3), gap: theme.spacing(1) },
  sourcesLabel: { fontSize: 14, color: theme.colors.textMuted, fontWeight: '700' },
  sourceItem: { fontSize: 15, color: theme.colors.textMuted, lineHeight: 22 },
});
