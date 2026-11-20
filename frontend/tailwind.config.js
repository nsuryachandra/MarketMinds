/** Tailwind CSS configuration */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F9FC',
        'canvas-deep': '#EEF2F7',
        cream: '#FFFFFF',
        ink: {
          DEFAULT: '#111827',
          soft: '#344054',
          mute: '#475467',
          faint: '#667085',
        },
        brand: {
          950: '#1E1B4B',
          900: '#312E81',
          800: '#3730A3',
          700: '#4338CA',
          600: '#4F46E5',
          500: '#6366F1',
          400: '#818CF8',
          300: '#A5B4FC',
          200: '#C7D2FE',
          100: '#E0E7FF',
          50: '#EEF2FF',
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
          DEFAULT: '#E5EAF1',
          soft: '#EEF2F6',
          strong: '#D0D8E4',
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
