/** Context Engine + voice endpoints. */
import { Platform } from 'react-native';

import { ApiError, api } from './client';
import { API_V1 } from '../config';

export type WhoIsThis = {
  matched: boolean;
  message: string;
  display_name?: string;
  relationship_label?: string;
  sources: { memory_id: number; text: string; memory_date: string | null }[];
};

export type WhyAmIHere = { message: string; place: string; part_of_day: string | null };
export type MemoryMoment = { available: boolean; message: string; memory_id: number | null };

function localDateTime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function whyAmIHere(token: string): Promise<WhyAmIHere> {
  return api<WhyAmIHere>(`/patient/why-am-i-here?local_datetime=${localDateTime()}`, { token });
}

export function memoryMoment(token: string): Promise<MemoryMoment> {
  return api<MemoryMoment>('/patient/memory-moment', { token });
}

/** Contextual "Who is this?" — richer than /identify. */
export function whoIsThis(photoUri: string, token: string): Promise<WhoIsThis> {
  return _multipart<WhoIsThis>('/patient/who-is-this', photoUri, 'frame.jpg', 'image/jpeg', token);
}

export type VoiceAnswer = {
  transcript: string;
  answer: string;
  grounded: boolean;
  sources: { memory_id: number; text: string; memory_date: string | null; similarity: number }[];
};

/** Send a voice recording; get back transcript + grounded answer. */
export function askByVoice(audioUri: string, token: string): Promise<VoiceAnswer> {
  return _multipart<VoiceAnswer>('/patient/ask/voice', audioUri, 'question.m4a', 'audio/m4a', token);
}

async function _multipart<T>(
  path: string,
  uri: string,
  name: string,
  type: string,
  token: string,
): Promise<T> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On web, `uri` is a blob: URL and the browser's real FormData needs an actual
    // Blob — the {uri, name, type} shorthand below is an Expo/React Native Web
    // convention the browser's own fetch/FormData don't understand; appending it
    // directly silently turns the file field into the text "[object Object]".
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name);
  } else {
    form.append('file', { uri, name, type } as never);
  }
  let res: Response;
  try {
    res = await fetch(`${API_V1}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Could not reach the server.', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(_errorMessage(body), res.status);
  }
  return body as T;
}

function _errorMessage(body: unknown): string {
  const b = body as { error?: { message?: string }; detail?: unknown } | null;
  if (b?.error?.message) return b.error.message;
  if (Array.isArray(b?.detail)) {
    const first = b.detail[0] as { msg?: string } | undefined;
    return first?.msg ?? 'Something went wrong.';
  }
  if (typeof b?.detail === 'string') return b.detail;
  return 'Something went wrong.';
}
