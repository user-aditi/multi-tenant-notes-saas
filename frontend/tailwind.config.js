/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        acme: {
          primary: '#3B82F6',
          secondary: '#1E40AF'
        },
        globex: {
          primary: '#10B981', 
          secondary: '#047857'
        }
      },
      screens: {
        'xs': '475px',
      }
    },
  },
  plugins: [],
}
