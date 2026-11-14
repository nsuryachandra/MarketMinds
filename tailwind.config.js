/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F1E8',
        'canvas-deep': '#EDE7DA',
        cream: '#FBF8F2',
        ink: {
          DEFAULT: '#1B1F2F',
          soft: '#454C61',
          mute: '#6B7285',
          faint: '#9AA0B1',
        },
        brand: {
          950: '#1D1B4B',
          900: '#25225C',
          800: '#2F2B77',
          700: '#3B3795',
          600: '#4946B4',
          500: '#5A57D4',
          400: '#7B78E2',
          300: '#A6A3EF',
          200: '#CBC9F7',
          100: '#E8E7FB',
          50: '#F4F3FD',
        },
        sea: {
          700: '#0B6863',
          600: '#0E7E77',
          500: '#14958C',
          400: '#35B0A5',
          200: '#A8DED8',
          100: '#DDF3F0',
          50: '#EEF9F7',
        },
        jade: {
          700: '#116A4A',
          600: '#158258',
          500: '#1D9B6A',
          200: '#AFE4CB',
          100: '#DFF4E9',
          50: '#EFFAF4',
        },
        gold: {
          700: '#936113',
          600: '#B4781A',
          500: '#D0922B',
          200: '#F1D9A8',
          100: '#F9EFD9',
          50: '#FDF8ED',
        },
        coral: {
          700: '#A84037',
          600: '#C64F44',
          500: '#DC6A5F',
          200: '#F6C6C0',
          100: '#FAE8E4',
          50: '#FDF4F2',
        },
        line: {
          DEFAULT: '#E7E0D3',
          soft: '#EFE9DE',
          strong: '#D8CFBE',
        },
      },
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope Variable', 'Manrope', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(27,31,47,0.03), 0 10px 24px -18px rgba(27,31,47,0.26)',
        glass:
          'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(27,31,47,0.04), 0 18px 40px -26px rgba(27,31,47,0.3)',
        lift: '0 2px 4px rgba(27,31,47,0.04), 0 26px 50px -26px rgba(27,31,47,0.32)',
        clay:
          'inset 2px 2px 4px rgba(255,255,255,0.95), inset -3px -4px 9px rgba(186,175,156,0.24), 0 12px 20px -14px rgba(27,31,47,0.3)',
        'inner-line': 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px rgba(27,31,47,0.035)',
        nav: '0 1px 0 rgba(27,31,47,0.05), 0 12px 32px -28px rgba(27,31,47,0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.35)' },
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
