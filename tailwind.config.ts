import type { Config } from 'tailwindcss';

// Kidcore palette per PRD Section 3b: teal dominant, purple ONLY as a sparse
// accent (CTA/badge/highlight). WCAG AA: text on `accent` must be large/bold
// or white — re-checked during the M6 audit.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E9AA8',
          50: '#EBF9FB',
          100: '#D0F1F4',
          200: '#A2E3E9',
          300: '#6FCFDA',
          400: '#38B4C4',
          500: '#0E9AA8',
          600: '#0B7B86',
          700: '#095F68',
          800: '#07454C',
          900: '#052F34',
        },
        secondary: {
          DEFAULT: '#14B8A6',
          100: '#CCFBF1',
          300: '#5EEAD4',
          500: '#14B8A6',
          700: '#0F766E',
        },
        accent: {
          DEFAULT: '#9333EA',
          100: '#F3E8FF',
          300: '#D8B4FE',
          500: '#9333EA',
          700: '#7E22CE',
        },
      },
      borderRadius: {
        // rounded-2xl/3xl is the default brand look — explicit token so ui/
        // components stay consistent without memorizing numbers.
        blob: '2rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgb(14 154 168 / 0.12)',
        pop: '0 8px 30px -4px rgb(147 51 234 / 0.25)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'blob-spin': {
          '0%, 100%': { borderRadius: '58% 42% 55% 45% / 45% 58% 42% 55%' },
          '50%': { borderRadius: '45% 55% 42% 58% / 55% 45% 58% 42%' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float 7s ease-in-out 1s infinite',
        blob: 'blob-spin 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
