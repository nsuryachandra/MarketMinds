/** Tailwind CSS configuration */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FBFBF9',
        'canvas-deep': '#F5F5F0',
        cream: '#FFFFFF',
        ink: {
          DEFAULT: '#141416',
          soft: '#27272A',
          mute: '#52525B',
          faint: '#71717A',
        },
        brand: {
          950: '#141416',
          900: '#2A1B0E',
          800: '#542E0F',
          700: '#8A4714',
          600: '#C8792C',
          500: '#D98A38',
          400: '#E8A758',
          300: '#F4D9A0',
          200: '#F9E8C4',
          100: '#FDF4E3',
          50: '#FDFBF7',
        },
        amber: {
          DEFAULT: '#C8792C',
          dark: '#A85A18',
          light: '#E08F35',
        },
        champagne: {
          DEFAULT: '#F4D9A0',
          glow: '#FBF0D9',
        },
        sea: {
          700: '#0F766E',
          600: '#0F9D92',
          500: '#14B8A6',
          400: '#2DD4BF',
          200: '#99F6E4',
          100: '#CCFBF1',
          50: '#ECFDF9',
        },
        jade: {
          700: '#027A48',
          600: '#079455',
          500: '#12B76A',
          200: '#A6F4C5',
          100: '#D1FADF',
          50: '#ECFDF3',
        },
        gold: {
          700: '#B54708',
          600: '#DC6803',
          500: '#F79009',
          200: '#FEDF89',
          100: '#FEF0C7',
          50: '#FFFAEB',
        },
        coral: {
          700: '#B42318',
          600: '#D92D20',
          500: '#F04438',
          200: '#FECDCA',
          100: '#FEE4E2',
          50: '#FEF3F2',
        },
        line: {
          DEFAULT: '#E2E8F0',
          soft: '#EDF2F7',
          strong: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope Variable', 'Manrope', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.04), 0 10px 28px -22px rgba(16,24,40,0.22)',
        glass: '0 1px 2px rgba(16,24,40,0.04), 0 14px 34px -26px rgba(16,24,40,0.24)',
        lift: '0 2px 4px rgba(16,24,40,0.04), 0 22px 44px -28px rgba(16,24,40,0.26)',
        clay: '0 1px 2px rgba(16,24,40,0.05), 0 10px 26px -22px rgba(16,24,40,0.22)',
        'inner-line': 'inset 0 0 0 1px rgba(16,24,40,0.035)',
        nav: '0 1px 0 rgba(16,24,40,0.05), 0 10px 30px -28px rgba(16,24,40,0.3)',
      },
      borderRadius: {
        '4xl': '1.5rem',
        '5xl': '1.75rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '600' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'draw-line': 'draw-line 2s ease-out both',
      },
    },
  },
  plugins: [],
}
