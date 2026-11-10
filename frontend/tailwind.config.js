/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Kantumruy Pro"', 'system-ui', 'sans-serif'],
        serif: ['Inter', '"Kantumruy Pro"', 'system-ui', 'sans-serif'],
        mono: ['Inter', '"Kantumruy Pro"', 'system-ui', 'sans-serif'],
        kantoumrouy: ['Inter', '"Kantumruy Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
