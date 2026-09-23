/**
 * The brand panel motif for the auth screen — individual moments (soft glowing
 * points) drawn together into one warm center. A visual metaphor for what the
 * product does: loose memories, held together into something a person can lean on.
 *
 * Placeholder-grade on purpose (gradients + circles, no external asset) so it can
 * be swapped for commissioned artwork later without touching the page around it.
 */
export function MemoryConstellation({ className = '' }: { className?: string }) {
  const points = [
    [70, 60], [340, 90], [60, 260], [300, 300], [40, 150], [370, 210], [200, 40], [220, 330],
  ];
  return (
    <svg viewBox="0 0 420 380" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="mc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F6C7B3" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#F6C7B3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mc-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EFA482" />
          <stop offset="100%" stopColor="#C0AFDD" />
        </linearGradient>
      </defs>

      <circle cx="210" cy="190" r="140" fill="url(#mc-glow)" opacity="0.5" />

      {points.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2="210" y2="190" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1" />
      ))}

      <g transform="translate(210 190)">
        <circle r="38" fill="url(#mc-core)" opacity="0.95" />
        <path d="M0 13c-8-11-22-11-22 3 0 10 11 18 22 26 11-8 22-16 22-26 0-14-14-14-22-3z" fill="#FFF" />
      </g>

      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 5 : 3.5} fill="#FFFFFF" opacity={i % 2 === 0 ? 0.85 : 0.55} />
      ))}
    </svg>
  );
}
