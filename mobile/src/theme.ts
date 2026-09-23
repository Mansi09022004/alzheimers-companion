/**
 * Design tokens for the patient app.
 *
 * Deliberately large, high-contrast, and calm. People with dementia benefit from
 * big touch targets, few words, generous spacing, and no visual clutter.
 *
 * Typography is Atkinson Hyperlegible everywhere — a typeface designed by the
 * Braille Institute specifically for low-vision readability. Not a decorative
 * choice: it's the single highest-leverage accessibility decision in this app.
 */
export const theme = {
  colors: {
    background: '#FCF2F1', // very light blush, low glare
    surface: '#FFFFFF',
    surfaceMuted: '#F4EEEF',
    surfaceWarm: '#FFFFFF', // clean white card base
    text: '#2B2620', // warm charcoal, not pure black
    textMuted: '#6B645C',
    border: '#EBE0E1',

    primary: '#367F79', // harbor teal — calm, trustworthy
    primaryDark: '#2B6862',
    primaryTint: '#DCEEEC',
    primaryText: '#FFFFFF',

    accent: '#D96238', // companion coral — warm, inviting CTA
    accentTint: '#FBE4DA',
    accentText: '#FFFFFF',

    lavender: '#8968B8', // memory moments, the assistant
    lavenderTint: '#EFEAF7',

    sage: '#6D9354', // safety, success
    sageTint: '#E4EEDE',

    mint: '#3F8A6E', // Medicines accent — muted green, readable on pale mint
    mintDark: '#2F7A5F',
    mintTint: '#E2F2E9',

    danger: '#C0392B', // SOS — kept deliberately urgent, not softened
    dangerTint: '#FBEEEC',
    dangerText: '#FFFFFF',

    peach: '#E8A579', // gentle warmth for imagery/illustration accents
    peachTint: '#FBEEE3',

    teal: '#4F9C9C', // soft teal — a second cool accent, distinct from primary harbor teal
    tealTint: '#E1F0EE',

    yellow: '#D9A441', // soft yellow — gentle highlight, streaks/celebration touches
    yellowTint: '#FBF1DC',

    pink: '#C97A93', // subtle pink — warmth accent for people/memories touches
    pinkTint: '#FBE5E8', // blush — My Day and soft warmth
  },
  font: {
    regular: 'AtkinsonHyperlegible_400Regular',
    bold: 'AtkinsonHyperlegible_700Bold',
  },
  fontSize: {
    caption: 15,
    body: 20,
    title: 28,
    hero: 38,
    button: 22,
  },
  // My Day only: a muted, dusty blush journal palette.
  day: {
    background: '#FDF6F7',
    card: '#FFFBFC',
    accent: '#D6A0B0',
    tint: '#F9ECEF', // badges, pills, date chips
    wash: '#F9EBEE', // soft top-of-page glow
  },
  spacing: (n: number) => n * 8,
  radius: 24,
  radiusSm: 16,
  radiusLg: 32,
  // Soft, low-contrast elevation — nothing in this app should look "techy" or sharp.
  shadow: {
    soft: {
      shadowColor: '#2B2620',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    card: {
      shadowColor: '#2B2620',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
  },
} as const;
