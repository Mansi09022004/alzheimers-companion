/** Context Engine + voice endpoints. */
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

export function whyAmIHere(token: string): Promise<WhyAmIHere> {
  const hour = new Date().getHours();
  return api<WhyAmIHere>(`/patient/why-am-i-here?local_hour=${hour}`, { token });
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
  form.append('file', { uri, name, type } as never);
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
    throw new ApiError(body?.error?.message ?? body?.detail ?? 'Something went wrong.', res.status);
  }
  return body as T;
}
