/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6fd',
          100: '#d9eafb',
          200: '#b8d9f6',
          300: '#8bc0ef',
          400: '#569fe3',
          500: '#1d6fb8',
          600: '#175a96',
          700: '#134a7a',
          800: '#123e63',
          900: '#123553',
        },
        success: { 50: '#f0fdf4', 500: '#16a34a', 600: '#15803d', 700: '#166534' },
        warning: { 50: '#fffbeb', 500: '#d97706', 600: '#b45309', 700: '#92400e' },
        danger: { 50: '#fef2f2', 500: '#dc2626', 600: '#b91c1c', 700: '#991b1b' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        popover: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 10px 15px -3px rgb(0 0 0 / 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'toast-in': 'toastIn 200ms ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        toastIn: { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
