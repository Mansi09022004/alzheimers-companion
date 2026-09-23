/** Approved memories, for the patient's own "My Memories" screen. */
import { api } from './client';

export type PatientMemory = {
  id: number;
  text: string;
  memory_date: string | null;
  person_id: number | null;
};

export function myMemories(token: string): Promise<PatientMemory[]> {
  return api<PatientMemory[]>('/patient/memories', { token });
}
