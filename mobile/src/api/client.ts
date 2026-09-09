/**
 * Tiny fetch wrapper.
 *
 * - prefixes the API base URL
 * - attaches the device bearer token when we have one
 * - parses JSON and turns non-2xx responses into a thrown `ApiError`
 *
 * It stays this small on purpose: no axios, no interceptor framework. Patient
 * device tokens are long-lived, so there is no access/refresh dance to handle here.
 */
import { API_V1 } from '../config';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, token } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_V1}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = payload?.error;
    throw new ApiError(
      err?.message ?? payload?.detail ?? 'Something went wrong.',
      res.status,
      err?.code,
    );
  }
  return payload as T;
}
