/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0284C7',
        },
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        borderSubtle: '#E2E8F0',
        medical: {
          success: '#10B981',
        },
        text: {
          main: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
