/** The people this patient knows — used by the "Familiar people" section. */
import { api } from './client';

export type FamiliarPerson = {
  id: number;
  display_name: string;
  relationship_label: string;
  photo_url: string | null;
};

export function myPeople(token: string): Promise<FamiliarPerson[]> {
  return api<FamiliarPerson[]>('/patient/people', { token });
}
