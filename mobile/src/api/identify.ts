/**
 * "Who is this?" — upload a camera frame to the backend, get back a match or "not sure".
 *
 * This is a multipart upload, so it doesn't use the JSON `api()` helper. React Native
 * sets the multipart boundary itself when the body is a FormData — do NOT set
 * Content-Type manually.
 */
import { ApiError } from './client';
import { API_V1 } from '../config';

export type IdentifyResult = {
  matched: boolean;
  person_id?: number;
  display_name?: string;
  relationship_label?: string;
  similarity?: number;
  message: string;
};

export async function identifyFace(photoUri: string, token: string): Promise<IdentifyResult> {
  const form = new FormData();
  form.append('file', { uri: photoUri, name: 'frame.jpg', type: 'image/jpeg' } as never);

  let res: Response;
  try {
    res = await fetch(`${API_V1}/patient/identify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Could not reach the server.', 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error?.message ?? body?.detail ?? 'Could not read the photo.', res.status);
  }
  return body as IdentifyResult;
}
