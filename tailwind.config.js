/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#fff5f5',
          100: '#fce8e8',
          500: '#a31313',
          600: '#920000',
          700: '#920000',
          800: '#800000',
          900: '#580000'
        },
        amber: {
          50: '#fff9e5',
          100: '#fff0b8',
          400: '#fec633',
          500: '#ffc702'
        }
      },
      boxShadow: { soft: '0 14px 40px rgba(45,62,80,.10)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
