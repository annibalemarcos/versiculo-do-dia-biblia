/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf8f0',
          100: '#f5edd9',
          200: '#ebdbb2',
          300: '#dec486',
          400: '#d0ac5b',
          500: '#c29337',
          600: '#a6772a',
          700: '#855923',
          800: '#6d4822',
          900: '#5a3d20',
          950: '#341f0f',
        },
        navy: {
          50: '#f0f4f9',
          100: '#dbe5f0',
          200: '#b8cde2',
          300: '#89aed0',
          400: '#558bb9',
          500: '#346fa1',
          600: '#275685',
          700: '#21466c',
          800: '#1e3c5a',
          900: '#1d344d',
          950: '#0f1d2d',
        }
      }
    },
  },
  plugins: [],
}
