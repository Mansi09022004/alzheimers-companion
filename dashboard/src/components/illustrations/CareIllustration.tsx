/**
 * The app's hero motif — soft overlapping organic shapes around a companion mark.
 *
 * Deliberately simple and built from paths/gradients rather than a photo or a
 * commissioned illustration, so it costs nothing to swap later: replace the JSX
 * body of this component and every screen that renders <CareIllustration /> picks
 * up the new artwork automatically.
 */
export function CareIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 360" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ci-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E67F57" />
          <stop offset="100%" stopColor="#8968B8" />
        </linearGradient>
        <linearGradient id="ci-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8CC7C1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8CC7C1" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* organic background blobs */}
      <path
        d="M60 120c10-55 70-90 140-78 60 10 100 55 108 112 8 58-30 108-95 118-70 11-140-16-160-72-10-28-1-56 7-80z"
        fill="#F5EEE1"
      />
      <path
        d="M255 55c46-14 92 8 104 55 11 44-14 88-58 103-52 18-108-8-118-58-9-46 24-86 72-100z"
        fill="url(#ci-ring)"
      />
      <path d="M70 250c30-22 70-18 88 10 16 26 4 58-26 72-34 16-70 2-82-28-10-25 0-40 20-54z" fill="#EFA482" opacity="0.18" />

      {/* two soft figures — the patient and the person who cares for them */}
      <circle cx="150" cy="168" r="46" fill="#FFFFFF" stroke="#B7DDD9" strokeWidth="2" />
      <circle cx="150" cy="150" r="16" fill="#B7DDD9" />
      <path d="M118 196c6-20 20-30 32-30s26 10 32 30" stroke="#8CC7C1" strokeWidth="4" strokeLinecap="round" fill="none" />

      <circle cx="248" cy="196" r="38" fill="#FFFFFF" stroke="#D9CFEC" strokeWidth="2" />
      <circle cx="248" cy="181" r="13" fill="#D9CFEC" />
      <path d="M222 218c5-16 16-24 26-24s21 8 26 24" stroke="#C0AFDD" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* connecting warmth mark between them */}
      <g transform="translate(186 132)">
        <circle r="26" fill="url(#ci-core)" />
        <path
          d="M0 9c-6-8-16-8-16 2 0 7 8 13 16 19 8-6 16-12 16-19 0-10-10-10-16-2z"
          fill="#FFF"
        />
      </g>

      {/* small sparkle accents */}
      <circle cx="330" cy="120" r="3.5" fill="#EFA482" />
      <circle cx="95" cy="95" r="3" fill="#8968B8" />
      <circle cx="320" cy="240" r="2.5" fill="#6D9354" />
    </svg>
  );
}
