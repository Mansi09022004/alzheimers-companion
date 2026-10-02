/** "Routine Detection" — patterns the backend has noticed in the patient's own history. */
import { api } from './client';

export type RoutineCategory = 'medication' | 'task' | 'routine' | 'visit' | 'journal' | 'location';

export type DetectedRoutine = {
  category: RoutineCategory;
  icon: string;
  message: string;
};

export function detectedRoutines(token: string): Promise<DetectedRoutine[]> {
  return api<DetectedRoutine[]>('/patient/routines/detected', { token });
}
