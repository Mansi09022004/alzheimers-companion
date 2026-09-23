export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
export const API_V1 = `${API_URL}/api/v1`;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

/** The patient app — where the device-level "Patient / Caregiver" role picker lives. */
export const PATIENT_APP_URL = (import.meta.env.VITE_PATIENT_APP_URL ?? 'http://localhost:8081').replace(/\/$/, '');
