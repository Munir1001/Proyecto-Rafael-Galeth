// tailwind.config.js
import flowbite from "flowbite-react/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    flowbite.content(), 
  ],
  // CAMBIO IMPORTANTE: En Tailwind v4 usa 'selector' en lugar de 'class'
  darkMode: 'selector', 
  theme: {
    extend: {
      colors: {
        primary: '#646cff',
        secondary: '#1e293b',
        background: '#f3f4f6',
        surface: '#ffffff',
        
        prio: {
          baja: '#10B981',
          media: '#F59E0B',
          alta: '#EF4444',
          urgente: '#DC2626',
        },
        estado: {
          nueva: '#6B7280',
          pendiente: '#3B82F6',
          progreso: '#8B5CF6',
          bloqueada: '#F97316',
          completada: '#10B981',
          vencida: '#DC2626',
          rechazada: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [
    flowbite.plugin(),
  ],
}