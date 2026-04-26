import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"IBM Plex Sans Arabic"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          50:  '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b7b7bf',
          400: '#8d8d97',
          500: '#6e6e78',
          600: '#54545d',
          700: '#3f3f47',
          800: '#27272d',
          900: '#18181c',
          950: '#0d0d11',
        },
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 15, 20, 0.04), 0 8px 24px rgba(15, 15, 20, 0.06)',
        glow: '0 0 0 4px rgba(99, 102, 241, 0.18)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: 0, transform: 'scale(0.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
      },
    },
  },
  plugins: [typography],
};
