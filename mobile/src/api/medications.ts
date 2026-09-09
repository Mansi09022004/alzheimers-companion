/** Medication reminders (patient view). */
import { api } from './client';

export type DoseStatus = 'upcoming' | 'due' | 'taken' | 'skipped' | 'missed';

export type DoseSlot = {
  medication_id: number;
  name: string;
  dosage_note: string | null;
  time: string;
  status: DoseStatus;
};

function localDateTime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function localDate(): string {
  return localDateTime().slice(0, 10);
}

export function medicationsToday(token: string): Promise<DoseSlot[]> {
  return api<DoseSlot[]>(`/patient/medications/today?local_datetime=${localDateTime()}`, { token });
}

export function markDose(
  medicationId: number,
  time: string,
  status: 'taken' | 'skipped',
  token: string,
): Promise<{ status: DoseStatus }> {
  return api(`/patient/medications/${medicationId}/doses/${time}`, {
    method: 'POST',
    body: { scheduled_date: localDate(), status },
    token,
  });
}
