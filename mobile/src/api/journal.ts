/** "My Day" — the patient's own journal. Real backend storage, one entry per date. */
import { Platform } from 'react-native';

import { ApiError, api } from './client';
import { API_V1 } from '../config';

export type JournalEntry = {
  id: number;
  entry_date: string; // "YYYY-MM-DD"
  text: string;
  created_at: string;
  updated_at: string;
};

export function listJournal(token: string): Promise<JournalEntry[]> {
  return api<JournalEntry[]>('/patient/journal', { token });
}

export function saveJournalEntry(entryDate: string, text: string, token: string): Promise<JournalEntry> {
  return api<JournalEntry>('/patient/journal', {
    method: 'POST',
    body: { entry_date: entryDate, text },
    token,
  });
}

/** Speech -> text for the journal's writing box. No reply, no RAG — just words to edit. */
export async function transcribeForJournal(audioUri: string, token: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // web's real FormData needs an actual Blob, not the {uri,name,type} RN shorthand.
    const blob = await (await fetch(audioUri)).blob();
    form.append('file', blob, 'entry.m4a');
  } else {
    form.append('file', { uri: audioUri, name: 'entry.m4a', type: 'audio/m4a' } as never);
  }

  let res: Response;
  try {
    res = await fetch(`${API_V1}/patient/journal/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Could not reach the server.', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? 'Could not hear that.', res.status);
  }
  return body?.transcript ?? '';
}
