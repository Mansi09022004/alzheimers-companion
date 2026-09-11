const COLORS = ['bg-brand-500', 'bg-teal-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return COLORS[hash % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const SIZES = { sm: 'h-7 w-7 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };

/** Initials avatar — no photo storage needed, and it's deterministic per name. */
export function Avatar({ name, size = 'md' }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full font-semibold text-white ${colorFor(name)} ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
