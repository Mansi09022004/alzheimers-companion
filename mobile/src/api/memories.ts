/** Approved memories, for the patient's own "My Memories" screen and "Remember This". */
import { Platform } from 'react-native';

import { ApiError, api } from './client';
import { API_V1 } from '../config';

export type PatientMemory = {
  id: number;
  text: string;
  memory_date: string | null;
  person_id: number | null;
  photo_url: string | null;
};

export function myMemories(token: string): Promise<PatientMemory[]> {
  return api<PatientMemory[]>('/patient/memories', { token });
}

/** "Remember This" — save the patient's own memory. No AI involved: just stored as-is. */
export function rememberThis(text: string, personId: number | null, token: string): Promise<PatientMemory> {
  return api<PatientMemory>('/patient/memories', {
    method: 'POST',
    body: { text, person_id: personId },
    token,
  });
}

/** Attaches a photo to a memory just created. A multipart upload, so it bypasses the JSON `api()` helper. */
export async function uploadMemoryPhoto(memoryId: number, photoUri: string, token: string): Promise<PatientMemory> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // web's real FormData needs an actual Blob, not the {uri,name,type} RN shorthand.
    const blob = await (await fetch(photoUri)).blob();
    form.append('file', blob, 'memory.jpg');
  } else {
    form.append('file', { uri: photoUri, name: 'memory.jpg', type: 'image/jpeg' } as never);
  }

  let res: Response;
  try {
    res = await fetch(`${API_V1}/patient/memories/${memoryId}/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Could not reach the server.', 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? body?.detail ?? 'Could not save that photo.', res.status);
  }
  return body as PatientMemory;
}
