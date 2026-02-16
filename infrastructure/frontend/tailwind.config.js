/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        keri: {
          dark: '#0f0f1a',
          darker: '#0a0a12',
          accent: '#6366f1',
          'accent-light': '#818cf8',
          surface: '#1a1a2e',
          'surface-light': '#252540',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
        },
      },
    },
  },
  plugins: [],
};
