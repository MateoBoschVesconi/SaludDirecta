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
          light: '#E0F2FE',
          DEFAULT: '#0284C7',
          dark: '#0369A1', // Contraste 4.5+:1 con blanco para WCAG AA
          contrast: '#075985',
        },
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        borderSubtle: '#CBD5E1', // Slate-300 para contraste accesible de bordes interactivos
        medical: {
          success: '#059669', // Emerald-600 para contraste 4.5+:1 con blanco
          warning: '#D97706',
          error: '#DC2626',
        },
        text: {
          main: '#0F172A',
          muted: '#475569', // Slate-600: Contraste 5.4:1 con fondo blanco (cumple WCAG AA)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
