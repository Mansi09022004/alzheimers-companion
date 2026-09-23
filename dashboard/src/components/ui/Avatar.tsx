import { API_URL } from '../../config';

const COLORS = ['bg-brand-500', 'bg-coral-500', 'bg-lavender-500', 'bg-sage-500', 'bg-info-500', 'bg-warning-500'];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return COLORS[hash % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const SIZES = { sm: 'h-11 w-11 text-base', md: 'h-16 w-16 text-xl', lg: 'h-24 w-24 text-3xl' };

/** Photo avatar when one has been uploaded; otherwise a deterministic initials avatar. */
export function Avatar({
  name,
  size = 'md',
  photoUrl,
}: {
  name: string;
  size?: keyof typeof SIZES;
  photoUrl?: string | null;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl.startsWith('http') ? photoUrl : `${API_URL}${photoUrl}`}
        alt={name}
        className={`inline-flex flex-none rounded-full object-cover ${SIZES[size]}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full font-display font-semibold text-white ${colorFor(name)} ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
