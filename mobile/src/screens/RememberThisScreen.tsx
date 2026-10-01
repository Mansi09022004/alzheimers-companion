/**
 * "Remember This" — the patient saves their own memory: a photo (camera or library,
 * both optional), a short description, and optionally who it's about. Saved straight
 * to the same Memories backend the caregiver dashboard reads (no AI, no new system) —
 * it shows up there, and back here, immediately.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { myPeople, type FamiliarPerson } from '../api/people';
import { rememberThis, uploadMemoryPhoto } from '../api/memories';
import { BigButton } from '../components/BigButton';
import { PersonAvatar } from '../components/PersonAvatar';
import { Screen } from '../components/Screen';
import { useAuth } from '../auth/AuthContext';
import type { MemoriesStackParamList } from '../navigation';
import { theme } from '../theme';

type Props = NativeStackScreenProps<MemoriesStackParamList, 'RememberThis'>;

export function RememberThisScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [people, setPeople] = useState<FamiliarPerson[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [personId, setPersonId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    myPeople(token).then(setPeople).catch(() => setPeople([]));
  }, [token]);

  const pickFromCamera = useCallback(async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (perm && !perm.granted) {
      setError('Camera permission is needed to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 }).catch(() => null);
    if (result && !result.canceled) setPhotoUri(result.assets[0].uri);
  }, []);

  const pickFromLibrary = useCallback(async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    if (perm && !perm.granted) {
      setError('Photo library permission is needed to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 }).catch(() => null);
    if (result && !result.canceled) setPhotoUri(result.assets[0].uri);
  }, []);

  const reset = () => {
    setPhotoUri(null);
    setText('');
    setPersonId(null);
    setError(null);
    setSaved(false);
  };

  const save = async () => {
    if (!token || !text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const memory = await rememberThis(text.trim(), personId, token);
      if (photoUri) {
        try {
          await uploadMemoryPhoto(memory.id, photoUri, token);
        } catch {
          // The memory itself is safely saved; only the photo didn't make it.
          setError("Saved, but the photo couldn't be uploaded. You can try adding it again later.");
        }
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Screen center showHelp>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>Memory saved!</Text>
        <Text style={styles.successText}>This will be kept safe for you.</Text>
        {error && <Text style={styles.photoWarning}>{error}</Text>}
        <View style={styles.successButtons}>
          <BigButton label="Add another" variant="accent" icon="add" onPress={reset} />
          <View style={{ height: theme.spacing(1.5) }} />
          <BigButton label="Done" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showHelp>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Add a photo and a few words about this moment.</Text>

        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            <Pressable onPress={() => setPhotoUri(null)} style={styles.removePhoto} accessibilityRole="button" accessibilityLabel="Remove photo">
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <Pressable onPress={pickFromCamera} style={({ pressed }) => [styles.photoButton, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel="Take a photo">
              <Ionicons name="camera" size={28} color={theme.colors.lavender} />
              <Text style={styles.photoButtonText}>Take a photo</Text>
            </Pressable>
            <Pressable onPress={pickFromLibrary} style={({ pressed }) => [styles.photoButton, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel="Choose from library">
              <Ionicons name="images" size={28} color={theme.colors.lavender} />
              <Text style={styles.photoButtonText}>Choose a photo</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>What happened?</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. Had tea on the porch with Rahul."
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          multiline
          numberOfLines={4}
          accessibilityLabel="Describe this memory"
        />

        {people.length > 0 && (
          <>
            <Text style={styles.label}>Who is it about? (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
              <Pressable
                onPress={() => setPersonId(null)}
                style={[styles.personChip, personId === null && styles.personChipActive]}
                accessibilityRole="button"
                accessibilityLabel="No one in particular"
              >
                <Text style={[styles.personChipText, personId === null && styles.personChipTextActive]}>No one in particular</Text>
              </Pressable>
              {people.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setPersonId(p.id)}
                  style={[styles.personPill, personId === p.id && styles.personPillActive]}
                  accessibilityRole="button"
                  accessibilityLabel={p.display_name}
                >
                  <PersonAvatar name={p.display_name} photoUrl={p.photo_url} size={40} />
                  <Text style={[styles.personName, personId === p.id && styles.personNameActive]} numberOfLines={1}>{p.display_name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.saveWrap}>
          <BigButton label="Save this memory" icon="heart" onPress={save} loading={saving} disabled={!text.trim()} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(1.5), paddingBottom: theme.spacing(6) },
  intro: { fontFamily: theme.font.regular, fontSize: 19, lineHeight: 27, color: theme.colors.textMuted },

  photoButtons: { flexDirection: 'row', gap: theme.spacing(1.5) },
  photoButton: {
    flex: 1,
    minHeight: 110,
    borderRadius: theme.radius,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.lavender + '50',
    backgroundColor: theme.colors.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoButtonText: { fontFamily: theme.font.bold, fontSize: 15, color: theme.colors.lavender, textAlign: 'center' },

  photoWrap: { borderRadius: theme.radius, overflow: 'hidden' },
  photo: { width: '100%', height: 220, borderRadius: theme.radius },
  removePhoto: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(43,38,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: { fontFamily: theme.font.bold, fontSize: 18, color: theme.colors.text, marginTop: theme.spacing(0.5) },
  input: {
    minHeight: 110,
    borderWidth: 2,
    borderColor: theme.colors.lavender + '30',
    borderRadius: theme.radiusSm,
    paddingHorizontal: theme.spacing(1.75),
    paddingVertical: theme.spacing(1.25),
    fontSize: 18,
    lineHeight: 25,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    textAlignVertical: 'top',
  },

  peopleRow: { gap: theme.spacing(1), paddingVertical: 2 },
  personChip: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(1.75),
    borderRadius: theme.radius,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  personChipActive: { borderColor: theme.colors.lavender, backgroundColor: theme.colors.lavenderTint },
  personChipText: { fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.textMuted },
  personChipTextActive: { fontFamily: theme.font.bold, color: theme.colors.lavender },
  personPill: {
    width: 84,
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing(1),
    paddingHorizontal: theme.spacing(0.5),
    borderRadius: theme.radius,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personPillActive: { borderColor: theme.colors.lavender, backgroundColor: theme.colors.lavenderTint },
  personName: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
  personNameActive: { fontFamily: theme.font.bold, color: theme.colors.lavender },

  errorText: { fontFamily: theme.font.bold, fontSize: 16, lineHeight: 22, color: theme.colors.danger },
  saveWrap: { marginTop: theme.spacing(1) },

  successIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  },
  successTitle: { fontFamily: theme.font.bold, fontSize: 28, color: theme.colors.text, textAlign: 'center' },
  successText: { fontFamily: theme.font.regular, fontSize: 18, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing(0.75) },
  photoWarning: { fontFamily: theme.font.regular, fontSize: 15, lineHeight: 21, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing(1), paddingHorizontal: theme.spacing(2) },
  successButtons: { marginTop: theme.spacing(3.5), width: '100%' },
});
