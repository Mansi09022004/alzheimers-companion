/** Ask the memory assistant a question (text). Voice is added in Phase 9. */
import { api } from './client';

export type AskAnswer = {
  answer: string;
  grounded: boolean;
  sources: { memory_id: number; text: string; memory_date: string | null; similarity: number }[];
};

export function askQuestion(question: string, token: string): Promise<AskAnswer> {
  return api<AskAnswer>('/patient/ask', { method: 'POST', body: { question }, token });
}
