/** "1 day", "2 days" — never "1 days". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** "Updated just now" / "Last updated 1 hour ago" / "Last updated 3 days ago". */
export function lastUpdatedLabel(ageSeconds: number): string {
  if (ageSeconds < 120) return 'Updated just now';
  if (ageSeconds < 3600) return `Last updated ${plural(Math.floor(ageSeconds / 60), 'minute')} ago`;
  if (ageSeconds < 86400) return `Last updated ${plural(Math.floor(ageSeconds / 3600), 'hour')} ago`;
  return `Last updated ${plural(Math.floor(ageSeconds / 86400), 'day')} ago`;
}

/** Metres under a kilometre ("850 m"), otherwise kilometres to one decimal ("2.1 km"). */
export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}
