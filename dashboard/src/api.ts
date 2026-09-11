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
  const headers: Record<string, string> = {};
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const isForm = opts.body instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json';
  // FormData: no Content-Type header — the browser sets it (with the boundary) itself.

  return fetch(`${API_V1}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
  });
}

// Single-flight: concurrent 401s share ONE refresh call. Refresh tokens rotate
// (single-use), so parallel refreshes would revoke each other and log the user out.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) return false;
      const res = await raw('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refresh },
        auth: false,
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.access_token, data.refresh_token);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
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
  update: (personId: number, data: Partial<Person>) =>
    request<Person>(`/people/${personId}`, { method: 'PATCH', body: data }),
  remove: (personId: number) => request<void>(`/people/${personId}`, { method: 'DELETE' }),
};

export type RelationshipType = 'parent' | 'child' | 'spouse' | 'sibling' | 'grandparent' | 'grandchild' | 'friend' | 'other';
export type PersonRelationship = {
  id: number;
  from_person_id: number;
  to_person_id: number;
  relationship: RelationshipType;
  note: string | null;
};

export const relationships = {
  list: (patientId: number) => request<PersonRelationship[]>(`/patients/${patientId}/relationships`),
  create: (patientId: number, data: { from_person_id: number; to_person_id: number; relationship: RelationshipType }) =>
    request<PersonRelationship>(`/patients/${patientId}/relationships`, { method: 'POST', body: data }),
  remove: (id: number) => request<void>(`/relationships/${id}`, { method: 'DELETE' }),
};

export type Consent = { id: number; person_id: number; purpose: string; granted_at: string; revoked_at: string | null };
export type FaceEmbedding = { id: number; person_id: number; model_version: string; det_score: number; created_at: string };

export const faces = {
  grantConsent: (personId: number, purpose?: string) =>
    request<Consent>(`/people/${personId}/consent`, { method: 'POST', body: purpose ? { purpose } : {} }),
  revokeConsent: (personId: number) => request<void>(`/people/${personId}/consent`, { method: 'DELETE' }),
  list: (personId: number) => request<FaceEmbedding[]>(`/people/${personId}/faces`),
  register: (personId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<FaceEmbedding>(`/people/${personId}/faces`, { method: 'POST', body: form });
  },
  remove: (faceId: number) => request<void>(`/faces/${faceId}`, { method: 'DELETE' }),
};

export const memories = {
  list: (patientId: number, status?: string) =>
    request<Memory[]>(`/patients/${patientId}/memories${status ? `?status=${status}` : ''}`),
  create: (patientId: number, data: { text: string; person_id?: number | null; memory_date?: string | null }) =>
    request<Memory>(`/patients/${patientId}/memories`, { method: 'POST', body: data }),
  review: (memoryId: number, decision: 'approved' | 'rejected') =>
    request<Memory>(`/memories/${memoryId}/review`, { method: 'POST', body: { decision } }),
  remove: (memoryId: number) => request<void>(`/memories/${memoryId}`, { method: 'DELETE' }),
  suggest: (patientId: number, notes: string) =>
    request<Memory[]>(`/patients/${patientId}/memories/suggest`, {
      method: 'POST',
      body: { notes, origin: 'dashboard_note' },
    }),
};

export type Medication = {
  id: number;
  name: string;
  dosage_note: string | null;
  schedule_times: string[];
  active: boolean;
};
export type Adherence = {
  from_date: string;
  to_date: string;
  taken: number;
  missed: number;
  skipped: number;
  adherence_rate: number;
  days: { date: string; taken: number; missed: number; skipped: number; upcoming: number }[];
};

export const medications = {
  list: (patientId: number) => request<Medication[]>(`/patients/${patientId}/medications`),
  create: (patientId: number, data: { name: string; dosage_note?: string | null; schedule_times: string[] }) =>
    request<Medication>(`/patients/${patientId}/medications`, { method: 'POST', body: data }),
  update: (id: number, data: Partial<Medication>) =>
    request<Medication>(`/medications/${id}`, { method: 'PATCH', body: data }),
  remove: (id: number) => request<void>(`/medications/${id}`, { method: 'DELETE' }),
  adherence: (patientId: number, days = 7) =>
    request<Adherence>(`/patients/${patientId}/medications/adherence?days=${days}`),
};

export type RoutineItem = {
  id: number;
  title: string;
  time_of_day: string;
  days_of_week: number[];
  active: boolean;
};

export const routine = {
  list: (patientId: number) => request<RoutineItem[]>(`/patients/${patientId}/routine-items`),
  create: (patientId: number, data: { title: string; time_of_day: string; days_of_week: number[] }) =>
    request<RoutineItem>(`/patients/${patientId}/routine-items`, { method: 'POST', body: data }),
  remove: (id: number) => request<void>(`/routine-items/${id}`, { method: 'DELETE' }),
};

export type LatestLocation = {
  point: { lat: number; lng: number; accuracy_m: number | null; recorded_at: string } | null;
  age_seconds: number | null;
};
export type Geofence = {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  active: boolean;
};
export type Alert = {
  id: number;
  type: 'geofence_exit' | 'geofence_return' | 'sos' | 'medication_missed';
  severity: 'info' | 'warning' | 'critical';
  reason_text: string;
  context: Record<string, unknown>;
  created_at: string;
  acknowledged_at: string | null;
};
export type Contact = { id: number; name: string; phone: string; relation: string | null; priority: number };

export const location = {
  latest: (patientId: number) => request<LatestLocation>(`/patients/${patientId}/location`),
  history: (patientId: number, hours = 24) =>
    request<{ lat: number; lng: number; recorded_at: string }[]>(
      `/patients/${patientId}/location/history?hours=${hours}&limit=500`,
    ),
};

export const geofences = {
  list: (patientId: number) => request<Geofence[]>(`/patients/${patientId}/geofences`),
  create: (patientId: number, data: { name: string; center_lat: number; center_lng: number; radius_m: number }) =>
    request<Geofence>(`/patients/${patientId}/geofences`, { method: 'POST', body: data }),
  remove: (id: number) => request<void>(`/geofences/${id}`, { method: 'DELETE' }),
};

export const alerts = {
  list: (patientId: number, unacknowledged = false) =>
    request<Alert[]>(`/patients/${patientId}/alerts${unacknowledged ? '?unacknowledged=true' : ''}`),
  acknowledge: (id: number) => request<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
};

export const emergency = {
  list: (patientId: number) => request<Contact[]>(`/patients/${patientId}/emergency-contacts`),
  create: (patientId: number, data: { name: string; phone: string; relation?: string | null; priority?: number }) =>
    request<Contact>(`/patients/${patientId}/emergency-contacts`, { method: 'POST', body: data }),
  remove: (id: number) => request<void>(`/emergency-contacts/${id}`, { method: 'DELETE' }),
};
