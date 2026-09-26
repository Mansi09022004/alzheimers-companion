/** The people this patient knows — the "Familiar people" section and "Who can help me?". */
import { api } from './client';

export type FamiliarPerson = {
  id: number;
  display_name: string;
  relationship_label: string;
  photo_url: string | null;
  phone: string | null;
};

export function myPeople(token: string): Promise<FamiliarPerson[]> {
  return api<FamiliarPerson[]>('/patient/people', { token });
}
