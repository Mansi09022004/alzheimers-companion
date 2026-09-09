/**
 * "Who is this?" flow.
 *
 * States: need-permission -> camera -> sending -> result.
 * On a match we show a short, calm sentence ("This is Rahul, your son.").
 * On no match we show a gentle fallback — never a wrong guess.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { identifyFace, type IdentifyResult } from '../api/identify';
import { BigButton } from '../components/BigButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../theme';

type Phase = 'camera' | 'sending' | 'result';

export function WhoIsThisScreen() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>('camera');
  const [result, setResult] = useState<IdentifyResult | null>(null);
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
      setResult(await identifyFace(photo.uri, token));
      setPhase('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('camera');
    }
  };

  if (phase === 'result' && result) {
    return (
      <Screen center>
        <Text style={styles.result}>{result.message}</Text>
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
  result: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  error: { color: theme.colors.danger, fontSize: theme.fontSize.body, marginBottom: theme.spacing(1) },
});
