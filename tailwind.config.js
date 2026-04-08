/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#17324d',
          accent: '#f0b04a',
          muted: '#64748b',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Manrope', 'Avenir Next', 'Segoe UI', 'sans-serif'],
      },
    }
  },
  plugins: []
};
