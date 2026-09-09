/** Daily routine (patient view). */
import { api } from './client';

export type RoutineToday = {
  routine_item_id: number;
  title: string;
  time_of_day: string;
  done: boolean;
};

function localDateTime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function routineToday(token: string): Promise<RoutineToday[]> {
  return api<RoutineToday[]>(`/patient/routine/today?local_datetime=${localDateTime()}`, { token });
}

export function completeRoutine(itemId: number, done: boolean, token: string) {
  return api(`/patient/routine/${itemId}/complete`, {
    method: 'POST',
    body: { on_date: localDateTime().slice(0, 10), done },
    token,
  });
}
