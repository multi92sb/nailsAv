/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        ivory: '#F8F4EF',
        paper: '#FFFDFA',
        cream: '#EFE5DA',
        espresso: '#2A211D',
        ink: '#171719',
        line: '#E6DBD0',
        muted: '#7C7069',
        gold: '#B79A6B',
        studio: '#F7F7F8',
        'studio-ink': '#171719',
        'studio-line': '#E8E8EC',
        coral: '#E11D48',
        brand: {
          50: '#FBF7F4',
          100: '#F2E3DF',
          200: '#E6CFC9',
          300: '#D8B5AE',
          400: '#C98E86',
          500: '#BD7D74',
          600: '#AF6F67',
          700: '#915B54',
          800: '#744A44',
          900: '#5D3D38',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(69, 48, 38, 0.08)',
        lift: '0 24px 60px rgba(69, 48, 38, 0.13)',
      },
    },
  },
  plugins: [],
};
