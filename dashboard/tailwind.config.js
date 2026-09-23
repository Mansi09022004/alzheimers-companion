/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm cream base — replaces plain white/slate.
        cream: {
          50: '#FDFBF7',
          100: '#FBF7F0',
          200: '#F5EEE1',
          300: '#EDE1CB',
        },
        ink: {
          50: '#F7F5F2',
          100: '#EDE9E3',
          300: '#B7AFA3',
          400: '#8C8377',
          500: '#6B645C',
          700: '#453F38',
          900: '#2B2620',
        },
        // Primary — Harbor teal. Calm + trustworthy, not clinical.
        brand: {
          50: '#EFF7F6',
          100: '#DCEEEC',
          200: '#B7DDD9',
          300: '#8CC7C1',
          400: '#5CA9A2',
          500: '#367F79',
          600: '#2B6862',
          700: '#22524D',
          800: '#1B413D',
          900: '#163330',
        },
        // Accent — Companion coral. Strong warm CTA, used sparingly.
        coral: {
          50: '#FDF3EF',
          100: '#FBE4DA',
          200: '#F6C7B3',
          300: '#EFA482',
          400: '#E67F57',
          500: '#D96238',
          600: '#B84D28',
          700: '#933D21',
        },
        // Secondary — Memory lavender. AI assistant + memory moments.
        lavender: {
          50: '#F6F4FB',
          100: '#ECE7F6',
          200: '#D9CFEC',
          300: '#C0AFDD',
          400: '#A488CB',
          500: '#8968B8',
          600: '#71519D',
          700: '#5A3F7D',
        },
        // Tertiary — Sage. Safety, location, success.
        sage: {
          50: '#F4F7F1',
          100: '#E6EEDF',
          200: '#CBDDBC',
          300: '#ACC896',
          400: '#8BAE71',
          500: '#6D9354',
          600: '#567542',
          700: '#445C35',
        },
        // Warm peach — medication + imagery accents.
        peach: {
          50: '#FDF6EF',
          100: '#FBEEE3',
          200: '#F0D2B0',
          300: '#E8A579',
          400: '#DC8B54',
          500: '#C06F3A',
          600: '#9C5A2E',
        },
        // Pale yellow — gentle highlight, celebratory touches.
        gold: {
          50: '#FDF8ED',
          100: '#FBF1DC',
          200: '#F0DBA8',
          300: '#E5C275',
          400: '#D9A441',
          500: '#B98530',
          600: '#8F6624',
        },
        // Muted pink — a soft warmth accent for people/memories.
        blossom: {
          50: '#FDF3F6',
          100: '#FBE9EF',
          200: '#F0C7D5',
          300: '#E2A0B6',
          400: '#C97A93',
          500: '#AD5D77',
          600: '#8A4760',
        },
        success: { 50: '#F4F7F1', 500: '#567542', 600: '#445C35', 700: '#37492B' },
        warning: { 50: '#FBF3E4', 500: '#C98A1F', 600: '#A66F16', 700: '#845811' },
        danger: { 50: '#FBEEEC', 500: '#C24B4B', 600: '#A83B3B', 700: '#852F2F' },
        info: { 50: '#EEF4F9', 500: '#4C86B0', 600: '#3D6D91', 700: '#325A76' },
        // Legacy alias so existing `slate-*` usages keep working while pages are migrated.
        slate: {
          50: '#F7F5F2',
          100: '#EDE9E3',
          200: '#E7DFD1',
          300: '#B7AFA3',
          400: '#8C8377',
          500: '#6B645C',
          600: '#5A5349',
          700: '#453F38',
          800: '#332E28',
          900: '#2B2620',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(43 38 32 / 0.05), 0 2px 8px 0 rgb(43 38 32 / 0.06)',
        popover: '0 8px 16px -4px rgb(43 38 32 / 0.10), 0 16px 32px -8px rgb(43 38 32 / 0.10)',
        soft: '0 1px 3px 0 rgb(43 38 32 / 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 260ms cubic-bezier(0.16,1,0.3,1)',
        'toast-in': 'toastIn 220ms cubic-bezier(0.16,1,0.3,1)',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        toastIn: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
};
