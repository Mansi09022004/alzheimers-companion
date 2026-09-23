/** Small, dependency-free date helpers for the patient screens ("YYYY-MM-DD" strings in, friendly text out). */

export function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Monday, 21 September" */
export function formatLong(iso: string): string {
  const d = parseIso(iso);
  return d ? d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) : iso;
}

/** "21 Sep 2026" */
export function formatShort(iso: string): string {
  const d = parseIso(iso);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : iso;
}

/** "September 2026" */
export function monthLabel(iso: string): string {
  const d = parseIso(iso);
  return d ? d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Earlier';
}

/** "8:00 AM" from "08:00" */
export function formatTime(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr ?? '00'} ${period}`;
}
