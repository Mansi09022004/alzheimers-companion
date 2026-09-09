/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6fd',
          500: '#1d6fb8',
          600: '#175a96',
          700: '#124875',
        },
      },
    },
  },
  plugins: [],
};
