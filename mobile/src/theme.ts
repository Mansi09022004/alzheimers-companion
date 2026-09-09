/**
 * Design tokens for the patient app.
 *
 * Deliberately large, high-contrast, and calm. People with dementia benefit from
 * big touch targets, few words, generous spacing, and no visual clutter.
 */
export const theme = {
  colors: {
    background: '#FBF9F4', // warm off-white, low glare
    surface: '#FFFFFF',
    text: '#1A1A1A',
    textMuted: '#5B5B5B',
    primary: '#1D6FB8', // calm blue
    primaryText: '#FFFFFF',
    danger: '#C0392B', // SOS
    dangerText: '#FFFFFF',
    border: '#E3DED3',
  },
  fontSize: {
    body: 20,
    title: 28,
    hero: 40,
    button: 24,
  },
  spacing: (n: number) => n * 8,
  radius: 20,
} as const;
