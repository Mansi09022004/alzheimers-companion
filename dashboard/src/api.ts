/**
 * API client for the caregiver dashboard.
 *
 * Holds the access token in memory and the refresh token in localStorage. On a 401
 * it transparently refreshes once and retries. All calls go through `request()`.
 */
import { API_V1 } from './config';

const REFRESH_KEY = 'alz_refresh';

let accessToken: string | null = null;
let onLogout: (() => void) | null = null;

export function setOnLogout(fn: () => void) {
  onLogout = fn;
}

export function setTokens(access: string | null, refresh?: string | null) {
  accessToken = access;
  if (refresh !== undefined) {
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  }
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Opts = { method?: string; body?: unknown; auth?: boolean };

async function raw(path: string, opts: Opts): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${API_V1}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const res = await raw('/auth/refresh', { method: 'POST', body: { refresh_token: refresh }, auth: false });
  if (!res.ok) return false;
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

export async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  let res = await raw(path, opts);

  if (res.status === 401 && opts.auth !== false && getRefreshToken()) {
    if (await tryRefresh()) {
      res = await raw(path, opts);
    } else {
      setTokens(null, null);
      onLogout?.();
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = payload?.error;
    throw new ApiError(err?.message ?? payload?.detail ?? res.statusText, res.status, err?.code);
  }
  return payload as T;
}

// --- typed endpoints ---

export type CaregiverUser = { id: number; email: string; full_name: string; role: string };
export type Patient = {
  id: number;
  full_name: string;
  date_of_birth: string | null;
  notes: string | null;
  home_label: string | null;
  home_lat: number | null;
  home_lng: number | null;
  created_by: number;
  my_access: 'owner' | 'viewer';
};
export type Person = {
  id: number;
  patient_id: number;
  display_name: string;
  relationship_label: string;
  short_bio: string | null;
  phone: string | null;
  is_active: boolean;
};
export type Memory = {
  id: number;
  patient_id: number;
  person_id: number | null;
  text: string;
  memory_date: string | null;
  status: 'pending' | 'approved' | 'rejected';
  source: 'caregiver' | 'ai_suggestion';
  created_at: string;
};

export const auth = {
  register: (email: string, password: string, full_name: string) =>
    request<CaregiverUser>('/auth/register', { method: 'POST', body: { email, password, full_name }, auth: false }),
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  me: () => request<CaregiverUser>('/auth/me'),
  logout: (refresh_token: string) =>
    request<void>('/auth/logout', { method: 'POST', body: { refresh_token }, auth: false }),
};

export const patients = {
  list: () => request<Patient[]>('/patients'),
  get: (id: number) => request<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) => request<Patient>('/patients', { method: 'POST', body: data }),
  update: (id: number, data: Partial<Patient>) =>
    request<Patient>(`/patients/${id}`, { method: 'PATCH', body: data }),
  createDevice: (id: number, label: string) =>
    request<{ device_id: number; pairing_code: string; pairing_expires_at: string }>(
      `/patients/${id}/devices`,
      { method: 'POST', body: { label } },
    ),
};

export const people = {
  list: (patientId: number) => request<Person[]>(`/patients/${patientId}/people`),
  create: (patientId: number, data: Partial<Person>) =>
    request<Person>(`/patients/${patientId}/people`, { method: 'POST', body: data }),
  remove: (personId: number) => request<void>(`/people/${personId}`, { method: 'DELETE' }),
};

export const memories = {
  list: (patientId: number, status?: string) =>
    request<Memory[]>(`/patients/${patientId}/memories${status ? `?status=${status}` : ''}`),
  create: (patientId: number, data: { text: string; person_id?: number | null; memory_date?: string | null }) =>
    request<Memory>(`/patients/${patientId}/memories`, { method: 'POST', body: data }),
  review: (memoryId: number, decision: 'approved' | 'rejected') =>
    request<Memory>(`/memories/${memoryId}/review`, { method: 'POST', body: { decision } }),
  remove: (memoryId: number) => request<void>(`/memories/${memoryId}`, { method: 'DELETE' }),
};
