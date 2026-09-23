/** "Today's Tasks" — simple one-off to-dos, real backend storage, per date. */
import { api } from './client';

export type Task = {
  id: number;
  task_date: string; // "YYYY-MM-DD"
  text: string;
  completed: boolean;
  completed_at: string | null;
  created_by: number | null;
};

export function tasksForDate(taskDate: string, token: string): Promise<Task[]> {
  return api<Task[]>(`/patient/tasks?task_date=${taskDate}`, { token });
}

export function createTask(text: string, taskDate: string, token: string): Promise<Task> {
  return api<Task>('/patient/tasks', { method: 'POST', body: { text, task_date: taskDate }, token });
}

export function setTaskCompleted(taskId: number, completed: boolean, token: string): Promise<Task> {
  return api<Task>(`/patient/tasks/${taskId}/complete`, { method: 'POST', body: { completed }, token });
}

export function deleteTask(taskId: number, token: string): Promise<void> {
  return api<void>(`/patient/tasks/${taskId}`, { method: 'DELETE', token });
}
