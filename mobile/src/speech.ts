/** Text-to-speech. Uses the device's built-in voices (offline, free). */
import * as Speech from 'expo-speech';

export function speak(text: string) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { rate: 0.9, pitch: 1.0 });
}

export function stopSpeaking() {
  Speech.stop();
}
